
import { NextResponse } from 'next/server';
import { admindb, db } from '@/db/db';
import { locations, locationState, vendorLevels, wallets } from '@/db/schemas';
import { encodeId } from '@/libs/server/sqids';
import { formatPhoneNumber } from '@/libs/server/db';
import { MonstroPlan, Sale } from '@/types/admin';
import { PackagePaymentPlan } from '@/types/admin';
import { VendorStripePayments } from '@/libs/server/stripe';
import { getPlan } from '../utils';
import { eq } from 'drizzle-orm';
import { getPaymentPlan } from '../utils';
import { sales } from '@/db/admin/sales';

const stripe = new VendorStripePayments();


export async function POST(req: Request) {
    const { saleId, vendorId, ...data } = await req.json();
    try {

        const sale = await admindb.query.sales.findFirst({
            where: (sale, { eq }) => eq(sale.id, saleId)
        })

        if (!sale || !sale.stripeCustomerId) {
            return NextResponse.json({ error: "Sale not found" }, { status: 400 })
        }

        let paymentPlan: PackagePaymentPlan | null = null;
        let plan: MonstroPlan | null = null;
        if (sale.planId) {
            plan = await getPlan(sale.planId)
        }

        if (sale.paymentId && sale.packageId) {
            paymentPlan = await getPaymentPlan(sale.paymentId, sale.packageId)
        }

        const today = new Date();

        const [location] = await db.insert(locations).values({
            ...data,
            vendorId,
            phone: formatPhoneNumber(data.phone),
            slug: data.name.toLowerCase().replace(/ /g, '')
        }).returning({ id: locations.id, name: locations.name })


        if (!location) {
            throw new Error("Error creating location")
        }

        const metadata = { vendorId, locationId: location.id }

        stripe.setCustomer(sale.stripeCustomerId)
        if (paymentPlan) {

            const downPayment = Number(paymentPlan.downPayment - paymentPlan.discount) * 100;
            if (paymentPlan.downPayment > 0) {
                await stripe.createPaymentIntent(downPayment, undefined, {
                    metadata
                })
            }
            if (paymentPlan.monthlyPayment > 0 && paymentPlan.priceId) {
                await stripe.createPaymentPlan(paymentPlan, sale.coupon || undefined, metadata)
            }
            await Promise.all([
                stripe.createPackageSubscriptions(metadata),
                stripe.createGHLSubscription(metadata)
            ]);
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

            await tx.insert(vendorLevels).values({
                vendorId,
                locationId: location.id
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
            closedOn: today,
            updated: today
        }).where(eq(sales.id, saleId));

        const encodedId = encodeId(location.id)

  
        return NextResponse.json({ ...location, id: encodedId, status: "active" }, { status: 200 })

    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

// async function ghlAutomations(sale: Sale) {

//     const integration = await admindb.query.adminIntegrations.findFirst({
//         where: (vendorIntegration, { eq }) => eq(vendorIntegration.service, "ghl")
//     })


//     if (!integration) {
//         throw new Error("GHL integration not found")
//     }
//     const ghl = new AgencyGHL()

//     await ghl.getAccessToken(integration)
//     const locationToken = await ghl.getLocationTokenFromAgency({
//         companyId: integration.providerId,
//         locationId: "rCcWpfkx9wZlMF7P4C5V",
//     })
    
// }   
