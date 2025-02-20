import { NextRequest, NextResponse } from "next/server";

import { headers } from "next/headers";
import Stripe from "stripe";
import { tryCatch } from "@/libs/utils";
import { waitUntil } from "@vercel/functions";

export async function POST(req: NextRequest) {
    console.log("Stripe webhook received");
    const body = await req.json();
    const signature = (await headers()).get("Stripe-Signature");

    if (body.type === "invoice.payment_failed") {
        console.log("Invoice payment failed");
        console.log(body.data.object.customer);
        console.log(body.data.object.subscription);
    }
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

    // return await syncStripeDataToKV(customerId);
}