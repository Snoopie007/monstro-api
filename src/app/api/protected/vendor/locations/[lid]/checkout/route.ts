
import { NextResponse } from 'next/server';
import { db, admindb } from '@/db/db';
import { locations, locationState, vendors, wallet } from '@/db/schemas';
import { decodeId } from '@/libs/server/sqids';
import { VendorStripePayments } from '@/libs/server/stripe';

import { eq } from 'drizzle-orm';
import { MonstroPlan } from '@/types/admin';
import { PackagePaymentPlan } from '@/types/admin';


const stripe = new VendorStripePayments();


export async function POST(req: Request) {
    const data = await req.json();
    const { vendorId, locationId, token, state } = data;
    const lid = decodeId(locationId);

    let paymentPlan: PackagePaymentPlan | null = null;

    if (state.packageId) {
        const pkg = await admindb.query.monstroPackages.findFirst({
            where: (pkg, { eq }) => eq(pkg.id, state.packageId),
            with: {
                paymentPlans: {
                    where: (plan, { eq }) => eq(plan.id, state.paymentPlanId)
                }
            }
        });

        if (!pkg) {
            throw new Error("Package not found")
        }

        paymentPlan = pkg.paymentPlans[0];
    }

    let plan: MonstroPlan | null = null;
    if (state.planId) {
        const p = await admindb.query.monstroPlans.findFirst({
            where: (plan, { eq }) => eq(plan.id, state.planId)
        });

        if (!p) {
            throw new Error("Plan not found")
        }

        plan = p;
    }

    try {
        const vendor = await db.query.vendors.findFirst({
            where: (vendor, { eq }) => eq(vendor.id, vendorId)
        });

        if (!vendor) {
            throw new Error("Vendor not found")
        }
        const customer = await stripe.createCustomer({
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
            if (paymentPlan.monthlyPayment > 0 && paymentPlan.priceId) {
                await stripe.createPaymentPlan(paymentPlan, metadata)
            }
            await Promise.all([
                stripe.createPackageSubscriptions(metadata),
                stripe.createGHLSubscription(metadata)
            ]);
        }

        if (plan && plan.id !== 1) {

            await stripe.createSubscription(plan, metadata, 0);
        }

        const today = new Date();
        await db.transaction(async (tx) => {
            await tx.update(locations).set({
                updated: today
            }).where(eq(locations.id, lid))

            const { created, ...rest } = state
            await tx.update(locationState).set({
                ...rest,
                status: "active",
                usagePercent: plan?.usagePercent,
                startDate: today,
                lastRenewalDate: today,
                updated: today,
            }).where(eq(locationState.locationId, lid))

            await tx.update(vendors).set({
                stripeCustomerId: customer.id,
                updated: today
            }).where(eq(vendors.id, vendorId))
        })

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
