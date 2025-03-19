
import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { locations, locationState, vendors, wallet } from '@/db/schemas';
import { decodeId } from '@/libs/server/sqids';
import { VendorStripePayments } from '@/libs/server/stripe';
import { MonstroPackage, MonstroPlan } from '@/types/vendor';

import { packages, plans } from "@/libs/data";
import { eq } from 'drizzle-orm';


const stripe = new VendorStripePayments();


export async function POST(req: Request) {
    const data = await req.json();
    const { vendorId, locationId, token, state } = data;
    const lid = decodeId(locationId);
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
            where: (vendor, { eq }) => eq(vendor.id, vendorId)
        });

        if (!vendor) {
            throw new Error("Vendor not found")
        }
        await stripe.createCustomer({
            firstName: vendor.firstName,
            lastName: vendor.lastName!,
            email: vendor.email!,
            phone: vendor.phone!,
        }, token.id, { vendorId });

        await chargeWallet(lid, vendorId, token);

        const metadata = { vendorId, locationId }

        if (paymentPlan) {
            const downPayment = Number(paymentPlan.downPayment - paymentPlan.discount) * 100;
            if (paymentPlan.downPayment > 0) {
                await stripe.createPaymentIntent(downPayment, token.card.id, {
                    metadata
                })
            }
            if (paymentPlan.monthlyPayment > 0) {
                await Promise.all([
                    stripe.createSubSchedule(paymentPlan, metadata),
                    stripe.createGHLSubSchedule(metadata)
                ]);
            }
        }

        if (plan && plan.id !== 1) {

            await stripe.createSubscription(plan, metadata, 0);
        }

        const today = new Date();
        // await db.transaction(async (tx) => {
        //     await tx.update(locations).set({
        //         updated: today
        //     }).where(eq(locations.id, decodedLocationId))

        //     const { created, ...rest } = state
        //     await tx.update(locationState).set({
        //         ...rest,
        //         status: "active",
        //         usagePercent: plan?.usagePercent,
        //         startDate: today,
        //         lastRenewalDate: today,
        //         updated: today,
        //     }).where(eq(locationState.locationId, decodedLocationId))

        //     await tx.update(vendors).set({
        //         stripeCustomerId: customer.id,
        //         updated: today
        //     }).where(eq(vendors.id, vendorId))
        // })

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

async function chargeWallet(locationId: number, vendorId: number, token: any) {
    const walletPayment = 10 * 100;
    const { clientSecret } = await stripe.createPaymentIntent(
        walletPayment,
        token.card.id,
        { description: `Auto-charge USD ${walletPayment / 100} was successfully added to wallet.` }
    );

    if (!clientSecret) {
        throw new Error("Wallet payment failed")
    }

    await db.insert(wallet).values({
        locationId: locationId,
        balance: walletPayment / 100,
        credit: 0,
        rechargeAmount: 2500,
        rechargeThreshold: 1000,
        lastCharged: new Date(),
    }).onConflictDoNothing({ target: [wallet.locationId] });

}
