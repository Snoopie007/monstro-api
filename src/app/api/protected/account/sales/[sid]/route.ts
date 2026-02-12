import { NextResponse } from 'next/server';
import { admindb, db } from '@/db/db';
import { locations, locationState, wallets } from '@subtrees/schemas';
import { VendorStripePayments } from '@/libs/server/stripe';
import { getPlan, notifyAdminAPI } from '../../utils';
import { eq } from 'drizzle-orm';
import { sales } from '@/db/admin/sales';
import Stripe from 'stripe';
import { Location } from '@subtrees/types';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { DEFAULT_LOCATION_SETTINGS } from '@/libs/data';

const stripe = new VendorStripePayments();

// Constants
const PLAN_IDS_REQUIRING_SUBSCRIPTION = [2, 3] as const;

export async function POST(req: Request) {
    const { saleId, vendorId, ...data } = await req.json();

    try {
        // Validate sale exists
        const sale = await admindb.query.sales.findFirst({
            where: (sale, { eq }) => eq(sale.id, saleId)
        });

        if (!sale || !sale.stripeCustomerId) {
            return NextResponse.json(
                { error: "We couldn't find your process id, please contact your sales rep." },
                { status: 404 }
            );
        }


        let location: Location | undefined;
        // Check for existing location
        const existingLocation = await db.query.locations.findFirst({
            where: (location, { eq, or }) => or(
                eq(location.name, data.name),
                eq(location.slug, data.slug)
            ),
            with: {
                locationState: true
            }
        });

        if (existingLocation?.locationState?.status === "active") {
            return NextResponse.json(
                {
                    error: "There is already an active location with that name.",
                    code: "LOCATION_ALREADY_EXISTS"
                },
                { status: 409 }
            );
        }

        if (!existingLocation) {
            const phoneNumber = parsePhoneNumberFromString(data.phone)?.number;
            const slug = data.name.toLowerCase().replace(/[^a-z0-9]/g, '-'); // Better slug generation

            const [loc] = await db.insert(locations).values({
                ...data,
                vendorId,
                phone: phoneNumber,
                slug,
            }).returning();

            location = loc;
        }
        if (!location) {
            return NextResponse.json(
                { error: "Failed to create location", code: "FAILED_TO_CREATE_LOCATION" },
                { status: 500 }
            );
        }

        const plan = await getPlan(sale.planId);
        const today = new Date();
        const metadata = { vendorId };

        stripe.setCustomer(sale.stripeCustomerId);

        // Create Stripe subscription if needed (before transaction to avoid orphaned subscriptions)
        let stripeSubscription: Stripe.Subscription | undefined;
        if (PLAN_IDS_REQUIRING_SUBSCRIPTION.includes(plan.id as any)) {
            const results = await Promise.all([
                stripe.createSubscription(plan, metadata, 0),
                stripe.createGHLSubscription(metadata),
            ]);
            stripeSubscription = results[0];

            if (sale.upgradeToScale && plan.id === 3) {
                await stripe.createScaleUpgrade(metadata);
            }
        }


        await db.transaction(async (tx) => {
            await tx.insert(locationState).values({
                planId: sale.planId || 1,
                settings: {
                    ...DEFAULT_LOCATION_SETTINGS,
                    ...(stripeSubscription?.id ? { stripeSubscriptionId: stripeSubscription.id } : {}),
                },
                agreeToTerms: sale.agreedToTerms,
                locationId: location.id,
                status: stripeSubscription?.status || 'incomplete',
                startDate: today,
                lastRenewalDate: today,
            });

            // Create wallet
            await tx.insert(wallets).values({
                locationId: location.id,
                lastCharged: today
            });

        });

        // Update sale status
        await admindb.update(sales).set({
            status: "Completed",
            locationId: location.id,
            closedOn: today,
            updated: today
        }).where(eq(sales.id, saleId));

        // Call external API (fire and forget, don't block response)
        notifyAdminAPI({
            email: sale.email,
            firstName: sale.firstName,
            lastName: sale.lastName,
            phone: sale.phone,
        }, location.id).catch(error => {
            console.error('Failed to notify external API:', error);
            // Could also send to error tracking service (Sentry, etc.)
        });
        return NextResponse.json(
            { ...location, id: location.id, status: "active" },
            { status: 200 }
        );
    } catch (err) {
        console.error('Error creating location from sale:', err);
        if (err instanceof Stripe.errors.StripeError) {
            return NextResponse.json(
                { error: err.message, code: err.code },
                { status: 500 }
            );
        }
        return NextResponse.json(
            {
                error: "Internal server error",
                code: "INTERNAL_SERVER_ERROR"
            },
            { status: 500 }
        );
    }
}
