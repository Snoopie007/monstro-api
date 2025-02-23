import { NextRequest, NextResponse } from "next/server";

import { headers } from "next/headers";
import Stripe from "stripe";
import { tryCatch } from "@/libs/utils";
import { waitUntil } from "@vercel/functions";
import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { locations } from "@/db/schemas";
import { decodeId } from "@/libs/server/sqids";

export async function POST(req: NextRequest) {

    const body = await req.json();
    const signature = (await headers()).get("Stripe-Signature");

    if (!signature) return NextResponse.json({ message: "No signature", status: 400 });


    async function doEventProcessing(): Promise<void> {
        if (typeof signature !== "string") {
            throw new Error("Stripe Hook Signature is not a string");
        }
        waitUntil(processEvent(body));
    }

    const { error } = await tryCatch(doEventProcessing());

    if (error) {
        console.error("[STRIPE HOOK] Error processing event", error);
    }

    return NextResponse.json({ message: "Stripe webhook received", status: 200 });
}


const allowedEvents: Stripe.Event.Type[] = [
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "customer.subscription.paused",
    "customer.subscription.resumed",
    "customer.subscription.pending_update_applied",
    "customer.subscription.pending_update_expired",
    "customer.subscription.trial_will_end",
    "invoice.paid",
    "invoice.payment_failed",
    "invoice.payment_action_required",
    "invoice.upcoming",
    "invoice.marked_uncollectible",
    "invoice.payment_succeeded",
    "payment_intent.succeeded",
    "payment_intent.payment_failed",
    "payment_intent.canceled",
];

async function processEvent(event: Stripe.Event) {

    // Skip processing if the event isn't one I'm tracking (list of all events below)
    if (!allowedEvents.includes(event.type)) return;

    // All the events I track have a customerId
    const { customer: customerId } = event.data?.object as {
        customer: string; // Sadly TypeScript does not know this
    };

    // This helps make it typesafe and also lets me know if my assumption is wrong
    if (typeof customerId !== "string") {
        throw new Error(
            `[STRIPE HOOK][CANCER] ID isn't string.\nEvent type: ${event.type}`
        );
    }

    if (event.type.startsWith("customer.subscription")) {
        return await processSubscriptionEvent(event);
    }

    if (event.type.startsWith("invoice")) {
        return await processInvoiceEvent(event);
    }
}

async function processSubscriptionEvent(event: Stripe.Event) {
    console.log("subscription event ", event.type)
    const subscription = event.data?.object as Stripe.Subscription;

    const { locationId } = subscription.metadata;
    if (!locationId) return;

    const statusMap = {
        'active': 'Active',
        'paused': 'Inactive',
        'past_due': 'Past due',
        'unpaid': 'Failed Payment'
    } as const;

    const locationStatus = statusMap[subscription.status as keyof typeof statusMap] || 'Inactive';

    if (locationStatus) {
        await db.update(locations).set({
            status: locationStatus,
            updated: new Date(),
        }).where(eq(locations.id, parseInt(locationId)));
    }
}

async function processInvoiceEvent(event: Stripe.Event) {
    console.log("invoice event ", event.type)
    const invoice = event.data?.object as Stripe.Invoice;
    const subscription = invoice.subscription_details as Stripe.Subscription;

    if (!subscription || !subscription.metadata) return;
    const { locationId } = subscription.metadata;
    if (!locationId) return;

    if (event.type === "invoice.payment_succeeded") {

        const decodedId = decodeId(locationId);
        try {
            const location = await db.query.locations.findFirst({
                where: (loc, { eq }) => eq(loc.id, decodedId),
            });

            if (!location || !location.progress.lastRenewalDate) return;
            const lastRenewalDate = new Date(location.progress.lastRenewalDate).setDate(new Date(location.progress.lastRenewalDate).getDate() + 28);
            await db.update(locations).set({
                progress: {
                    ...location.progress,
                    lastRenewalDate: new Date(lastRenewalDate).getTime() * 1000,
                },
                updated: new Date(),
            }).where(eq(locations.id, decodedId));
        } catch (error) {
            console.error("Error updating location", error)
        }
    }
}


