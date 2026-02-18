import { Elysia, t } from "elysia";
import Stripe from "stripe";
import { MemberStripePayments } from "@/libs/stripe";
import { serverConfig } from "@/config";
/**
 * Stripe Webhook Handler for Member Billing Events
 *
 * This webhook handles various Stripe events related to member billing:
 *
 */


const allowedEvents: Stripe.Event.Type[] = [
    "invoice.payment_failed",
    "invoice.payment_action_required",
    "invoice.payment_succeeded",
    "invoice.finalized",
    "invoice.updated",
    "payment_intent.canceled",
    "payment_intent.succeeded",
];


const stripe = new MemberStripePayments();


export function stripeWebhookRoutes(app: Elysia) {
    app.post('/member/stripe', async ({ body, headers, request, status }) => {

        const signature = headers["stripe-signature"];
        if (typeof signature !== "string") {
            throw new Error("Stripe Hook Signature is not a string");
        }
        if (!process.env.STRIPE_WEBHOOK_SECRET) {
            throw new Error("Stripe Member webhook secret not found");
        }

        let event: Stripe.Event;
        try {
            if (serverConfig.isProduction) {
                const rawText = await request.text();
                event = await stripe.constructEventAsync(
                    Buffer.from(rawText),
                    signature,
                    process.env.STRIPE_WEBHOOK_SECRET
                );
            } else {
                event = body as unknown as Stripe.Event;
            }
        } catch (err) {
            console.error("[STRIPE WEBHOOK] Failed to construct event:", err);
            return status(500, { error: "[STRIPE WEBHOOK] Failed to construct event" });
        }
        // Non-blocking: process in background; do not rethrow
        processEvent(event).catch(err => {
            console.error("[STRIPE WEBHOOK] Failed to process event:", err);
        });
        return status(200, { message: "[STRIPE WEBHOOK] Event processed successfully" });
    }, {
        headers: t.Object({
            "stripe-signature": t.String(),
        }),
        parse: 'none'
    });
    return app;
}

async function processEvent(event: Stripe.Event) {
    if (!allowedEvents.includes(event.type)) {
        return;
    }

    console.log('[STRIPE WEBHOOK] Processing event:', event.type);

    try {
        switch (event.type) {
            case "payment_intent.succeeded":
                break;
            case "payment_intent.canceled":
                break;
            case "payment_intent.payment_failed":
                break;


                break;
            default:
                console.warn(`[STRIPE WEBHOOK] Unhandled event type: ${event.type}`);
        }
    } catch (error) {
        console.error(
            `[STRIPE WEBHOOK] Error processing event ${event.type} (${event.id}):`,
            error
        );
        throw error;
    }
}
