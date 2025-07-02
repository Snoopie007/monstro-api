
import { NextResponse } from 'next/server';
import { admindb, db } from '@/db/db';
import { locations, locationState, wallets } from '@/db/schemas';
import { encodeId } from '@/libs/server/sqids';
import { formatPhoneNumber } from '@/libs/server/db';
import { MonstroPlan } from '@/types/admin';
import { PackagePaymentPlan } from '@/types/admin';
import { VendorStripePayments } from '@/libs/server/stripe';
import { getPlan } from '../utils';
import { eq } from 'drizzle-orm';
import { getPaymentPlan } from '../utils';
import { sales } from '@/db/admin/sales';
import { Location } from '@/types';

const stripe = new VendorStripePayments();


export async function POST(req: Request) {
    const { saleId, vendorId, ...data } = await req.json();
    console.log('Data', data)
    try {

        const sale = await admindb.query.sales.findFirst({
            where: (sale, { eq }) => eq(sale.id, saleId)
        })

        if (!sale || !sale.stripeCustomerId) {
            throw new Error("We couldn't find your process id, please contact your sales rep.")
        }

        const today = new Date();

        let location: Location | undefined = undefined;
        location = await db.query.locations.findFirst({
            where: (location, { eq, or }) => or(eq(location.name, data.name), eq(location.slug, data.slug)),
            with: {
                locationState: true
            }
        });

        console.log('Existing location', location)
        console.log('Location state', location?.locationState)

        const state = location?.locationState;

        if (state && state.status === "active") {
            throw new Error("There is already an active location with that name.")
        }

        if (!location) {
            const [loc] = await db.insert(locations).values({
                ...data,
                vendorId,
                phone: formatPhoneNumber(data.phone),
                slug: data.slug
            }).returning()
            location = loc;
        }

        if (!location) {
            throw new Error("Failed to create location")
        }

        let paymentPlan: PackagePaymentPlan | null = null;
        let plan: MonstroPlan | null = null;
        if (sale.planId) {
            plan = await getPlan(sale.planId)
        }

        if (sale.paymentId && sale.packageId) {
            paymentPlan = await getPaymentPlan(sale.paymentId, sale.packageId)
        }



        const metadata = { vendorId, locationId: location.id }

        stripe.setCustomer(sale.stripeCustomerId)
        if (paymentPlan) {
            const downPayment = Number(paymentPlan.downPayment - paymentPlan.discount) * 100;

            const promises = [];
            if (paymentPlan.downPayment > 0) {
                promises.push(stripe.createPaymentIntent(downPayment, undefined, {
                    metadata
                }));
            }
            promises.push(
                stripe.createGHLSubscription(metadata),
                stripe.createPackageSubscriptions(metadata)
            );

            if (paymentPlan.monthlyPayment > 0 && paymentPlan.priceId) {
                promises.push(stripe.createPaymentPlan(paymentPlan, sale.coupon || undefined, metadata));
            }

            await Promise.all(promises);
        }

        if (plan && ![1, 4].includes(plan.id)) {
            await stripe.createSubscription(plan, metadata, 0);
        }

        await db.transaction(async (tx) => {
            await tx.insert(locationState).values({
                paymentPlanId: sale.paymentId,
                planId: sale.planId,
                pkgId: sale.packageId,
                agreeToTerms: sale.agreedToTerms,
                locationId: location.id,
                status: "active",
                usagePercent: plan?.usagePercent,
                startDate: today,
                lastRenewalDate: today,
            })

            await tx.insert(wallets).values({
                locationId: location.id,
                balance: 0,
                credits: 0,
                lastCharged: today
            })
        });

        await admindb.update(sales).set({
            status: "Completed",
            locationId: location.id,
            closedOn: today,
            updated: today
        }).where(eq(sales.id, saleId));


        return NextResponse.json({ ...location, id: location.id, status: "active" }, { status: 200 })
    } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : "An unknown error occurred" }, { status: 500 })
    }
}


