
import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { locations, locationState, vendors, wallet } from '@/db/schemas';
import { decodeId } from '@/libs/server/sqids';
import { VendorStripePayments } from '@/libs/server/stripe';
import { MonstroPackage } from '@/types/vendor';

import { packages, plans } from "@/libs/data";
import { eq } from 'drizzle-orm';


const stripe = new VendorStripePayments();

export async function POST(req: Request) {
    const data = await req.json();
    const { vendorId, locationId, token, state } = data;
    const decodedLocationId = decodeId(locationId);

    const paymentPlan = state.pkgId
        ? packages.find((p: MonstroPackage) => p.id === state.pkgId)?.paymentPlans.find(p => p.id === state.paymentPlanId)
        : undefined;

    const plan = !state.pkgId
        ? plans.find(p => p.id === state.planId)
        : undefined;

    if (!plan && !paymentPlan) {
        throw new Error("Plan not found")
    }

    try {
        const vendor = await db.query.vendors.findFirst({
            where: (vendor, { eq }) => eq(vendor.id, vendorId),
            columns: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
            }
        });

        if (!vendor) {
            throw new Error("Vendor not found")
        }
        const customer = await stripe.createCustomer({
            firstName: vendor.firstName,
            lastName: vendor.lastName!,
            email: vendor.email!,
            phone: vendor.phone!,
        }, token.id, {
            locationId: locationId,
            vendorId: vendorId
        });

        const walletPayment = 10 * 100;
        const { clientSecret } = await stripe.createPaymentIntent(
            walletPayment,
            customer.id,
            token.card.id,
            { description: `Auto-charge USD ${walletPayment / 100} was successfully added to wallet.` }
        );

        if (!clientSecret) {
            throw new Error("Payment failed")
        }

        await db.insert(wallet).values({
            locationId: decodedLocationId,
            balance: walletPayment / 100,
            credit: 0,
            rechargeAmount: 20,
            rechargeThreshold: 10,
            lastCharged: new Date(),
        }).onConflictDoNothing({ target: [wallet.locationId] });

        if (paymentPlan) {
            const downPayment = Number(paymentPlan.downPayment - paymentPlan.discount) * 100;
            if (paymentPlan.downPayment > 0) {
                await stripe.createPaymentIntent(downPayment, customer.id, token.card.id)
            }
            if (paymentPlan.monthlyPayment > 0) {
                const basicPlan = plans.find(p => p.id === 2);
                await Promise.all([
                    // add payment plan description
                    stripe.createPaymentPlan(paymentPlan, customer.id, vendorId, locationId),
                    stripe.createSubscription(basicPlan!, customer.id, vendorId, locationId, 365)
                ]);
            }
        }

        if (plan && plan.id !== 1) {
            await stripe.createSubscription(plan, customer.id, vendorId, locationId);
        }

        const today = new Date();
        await db.transaction(async (tx) => {
            await tx.update(locations).set({
                updated: today
            }).where(eq(locations.id, decodedLocationId))

            const { created, ...rest } = state
            await tx.update(locationState).set({
                ...rest,
                status: "active",
                usagePercent: plan?.usagePercent,
                startDate: today,
                lastRenewalDate: today,
                updated: today,
            }).where(eq(locationState.locationId, decodedLocationId))

            await tx.update(vendors).set({
                stripeCustomerId: customer.id,
                updated: today
            }).where(eq(vendors.id, vendorId))
        }).catch(err => console.log(err))

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

