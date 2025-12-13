
import { NextResponse } from 'next/server';
import { admindb, db } from '@/db/db';
import { locations, locationState, wallets } from '@/db/schemas';
import { VendorStripePayments } from '@/libs/server/stripe';
import { getPlan } from '../../utils';
import { eq } from 'drizzle-orm';
import { sales } from '@/db/admin/sales';
import { Location } from '@/types';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { DEFAULT_LOCATION_SETTINGS } from '@/libs/data';
const stripe = new VendorStripePayments();


export async function POST(req: Request) {
    const { saleId, vendorId, ...data } = await req.json();

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


        const state = location?.locationState;

        if (state && state.status === "active") {
            throw new Error("There is already an active location with that name.")
        }

        if (!location) {
            const [loc] = await db.insert(locations).values({
                ...data,
                vendorId,
                phone: parsePhoneNumberFromString(data.phone)?.number,
                slug: data.name.toLowerCase().replace(/ /g, "")
            }).returning()
            location = loc;
        }

        if (!location) {
            throw new Error("Failed to create location")
        }

        const plan = await getPlan(sale.planId)

        const metadata = { vendorId, locationId: location.id }

        stripe.setCustomer(sale.stripeCustomerId)

        let stripeSubscriptionId: string | undefined;
        if ([2, 3].includes(plan.id)) {
            const results = await Promise.all([
                stripe.createSubscription(plan, metadata, 0),
                stripe.createGHLSubscription(metadata),
            ]);
            stripeSubscriptionId = results[0].id;
            if (sale.upgradeToScale && plan.id === 3) {
                await stripe.createScaleUpgrade(metadata)
            }
        }


        await db.transaction(async (tx) => {
            await tx.insert(locationState).values({
                planId: sale.planId || 1,
                settings: DEFAULT_LOCATION_SETTINGS,
                agreeToTerms: sale.agreedToTerms,
                locationId: location.id,
                stripeSubscriptionId,
                status: "active",
                startDate: today,
                lastRenewalDate: today,
            })

            await tx.insert(wallets).values({
                locationId: location.id,
                lastCharged: today
            })

        });

        const [updatedSale] = await admindb.update(sales).set({
            status: "Completed",
            locationId: location.id,
            closedOn: today,
            updated: today
        }).where(eq(sales.id, saleId)).returning();
        console.log('Updated sale to completed', updatedSale);
        try {
            await fetch('https://api.mymonstroapp.com/api/public/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer 4087c1d6-5bb9-47a5-8598-c2a0868c6a78`
                },
                body: JSON.stringify({
                    email: sale.email,
                    firstName: sale.firstName,
                    lastName: sale.lastName,
                    phone: sale.phone,
                    lid: location.id,
                })
            })
        } catch (error) {
            console.log(error);
        }

        return NextResponse.json({ ...location, id: location.id, status: "active" }, { status: 200 })
    } catch (err) {
        console.log(err)
        const error = err instanceof Error ? err.message : "An unknown error occurred"
        return NextResponse.json({ error }, { status: 500 })
    }
}


