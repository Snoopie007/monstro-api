import { NextRequest, NextResponse } from "next/server";

import { headers } from "next/headers";
import Stripe from "stripe";
import { tryCatch } from "@/libs/utils";
import { waitUntil } from "@vercel/functions";
import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { locations, locationState } from "@/db/schemas";
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


    if (subscription.status) {
        await db.update(locationState).set({
            status: subscription.status,
            updated: new Date(),
        }).where(eq(locationState.locationId, parseInt(locationId)));
    }
}
/**
* Checks if a given date is today
* @param date - Date to check, can be null
* @returns boolean - true if date is today, false otherwise or if null
*/
function isToday(date: Date | null, today: Date) {
    if (!date) return false;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
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
            const state = await db.query.locationState.findFirst({
                where: (locState, { eq }) => eq(locState.locationId, decodedId),
            });

            if (!state || !state.lastRenewalDate) return;
            /** 
             * Set today's date to midnight for consistent date comparison
             * This removes any time component when checking dates
             */
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            /**
             * Guard clause to prevent duplicate invoice processing
             * We only want to process the renewal if either:
             * - It's the initial activation date
             * - It's the scheduled renewal date
             */
            if (!isToday(state.startDate, today) && !isToday(state.lastRenewalDate, today)) {
                return;
            }
            const lastRenewalDate = new Date(state.lastRenewalDate).setDate(new Date(state.lastRenewalDate).getDate() + 28);
            await db.update(locationState).set({
                lastRenewalDate: new Date(lastRenewalDate),
                updated: new Date(),
            }).where(eq(locationState.locationId, decodedId));
        } catch (error) {
            console.error("Error updating location", error)
        }
    }
}


