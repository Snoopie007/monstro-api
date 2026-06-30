import { Elysia, t } from "elysia";
import Stripe from "stripe";
import { VendorStripePayments } from "@/libs/stripe";
import { db } from "@/db/db";
import { memberLocations } from "@subtrees/schemas";
import type { PaymentType } from "@subtrees/types";
import { and, eq } from "drizzle-orm";
import { handleStripeOrderCharge, handleStripePlanCharge, handleStripeTicketCharge } from "@/routes/webhooks/handlers/stripe";

/**
 * Stripe Webhook Handler for Member Billing Events
 *
 * This webhook handles various Stripe events related to member billing:
 *
 */


const allowedEvents: Stripe.Event.Type[] = [
    "payment_intent.payment_failed",
    "payment_intent.canceled",
    "payment_intent.succeeded",
    "application_fee.created",
    "application_fee.refunded",
    "customer.created",
    "customer.updated",
    "customer.deleted",
    "transfer.created",
    "transfer.updated",
    "charge.succeeded",
    "charge.failed",
    "charge.updated",
    "charge.refunded",
    "charge.captured",
    "charge.dispute.created",
    "charge.dispute.updated",
    "charge.dispute.closed",
    "charge.dispute.funds_withdrawn",
];


const stripe = new VendorStripePayments();

type StripeMetadata = {
    locationId: string;
    memberId: string;
    invoiceId?: string;
    memberPlanId?: string;
    orderId?: string;
    registrationId?: string;
};

const isProd = process.env.BUN_ENV === "production";

export function stripeWebhookRoutes(app: Elysia) {

    app.post('/connected/stripe', async ({ body, headers, request, status }) => {

        const signature = headers["stripe-signature"];
        console.log("signature", signature);
        if (typeof signature !== "string") {
            throw new Error("Stripe Hook Signature is not a string");
        }
        if (!process.env.STRIPE_CONNECTED_WEBHOOK_SECRET) {
            throw new Error("Stripe Member webhook secret not found");
        }

        let event: Stripe.Event;
        try {
            if (isProd) {
                const rawText = await request.text();
                event = await stripe.constructEventAsync(
                    Buffer.from(rawText),
                    signature,
                    process.env.STRIPE_CONNECTED_WEBHOOK_SECRET
                );
            } else {
                event = body as Stripe.Event;
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
        parse: isProd ? 'none' : 'json'
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
            case "customer.deleted":
                await handleCustomer(event);
                break;
            case "charge.succeeded":
            case "charge.failed":
                await handleCharge(event);
                break;

            case "payment_intent.payment_failed":
            case "payment_intent.canceled":
                await handlePaymentIntentFailure(event);
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

async function handleCustomer(event: Stripe.Event) {
    const customer = event.data.object as Stripe.Customer;
    const stripeAccountId = event.account;
    console.log(`[STRIPE WEBHOOK] Customer ${event.type}:`, customer.id, stripeAccountId);

    const customerId = customer.id;
    console.log(`[STRIPE WEBHOOK] Customer ID:`, customerId);
    const ml = await db.query.memberLocations.findFirst({
        where: (ml, { eq: equal }) => equal(ml.gatewayCustomerId, customerId),
        columns: {
            memberId: true,
            locationId: true,
        },
    });
    if (!ml) return;

    await db.update(memberLocations).set({
        gatewayCustomerId: null,
    }).where(and(eq(memberLocations.memberId, ml.memberId), eq(memberLocations.locationId, ml.locationId)));
    console.log(`[STRIPE WEBHOOK] Strtipe Customer ID Removed from Location`);
}

async function handleCharge(event: Stripe.Event) {

    const charge = event.data.object as Stripe.Charge;
    const stripeAccountId = event.account;
    console.log(`[STRIPE WEBHOOK] Charge ${event.type}:`, charge.id, stripeAccountId);

    const paymentMethodDetails = charge.payment_method_details;
    let metadata = charge.metadata as unknown as StripeMetadata;



    if ((!metadata.invoiceId || !metadata.orderId) && typeof charge.payment_intent === "string") {
        const integration = await db.query.integrations.findFirst({
            where: (integration, { eq }) => eq(integration.accountId, stripeAccountId || ""),
            columns: { accessToken: true },
        });

        if (integration?.accessToken) {
            const stripeClient = new Stripe(integration.accessToken);
            const paymentIntent = await stripeClient.paymentIntents.retrieve(charge.payment_intent, {}, {
                stripeAccount: stripeAccountId || undefined,
            });
            metadata = paymentIntent.metadata as unknown as StripeMetadata;
        }
    }

    if (!metadata.locationId || !metadata.memberId) {
        throw new Error("Stripe charge is missing required billing metadata");
    }


    const paymentType: PaymentType = paymentMethodDetails?.type === "us_bank_account" ? "us_bank_account" : "card";
    const receiptUrl = charge.receipt_url;
    const paymentMethodId = charge.payment_method;
    const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id || null;
    const feeAmount = charge.application_fee_amount || 0;

    if (metadata.orderId) {
        await handleStripeOrderCharge({
            orderId: metadata.orderId,
            locationId: metadata.locationId,
            memberId: metadata.memberId,
            paymentType,
            success: charge.paid,
            failedReason: charge.failure_message,
            failedCode: charge.failure_code || charge.outcome?.reason || null,
            amount: charge.amount,
            paymentMethodId: charge.payment_method,
            paymentIntentId: typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id || null,
            feeAmount: charge.application_fee_amount || 0,
            stripeChargeId: charge.id,
        });
        console.log(`[STRIPE WEBHOOK] Order charge ${charge.id} processed successfully`);
        return;
    }



    if (metadata.memberPlanId && metadata.invoiceId) {

        await handleStripePlanCharge({
            invoiceId: metadata.invoiceId,
            memberPlanId: metadata.memberPlanId,
            locationId: metadata.locationId,
            memberId: metadata.memberId,
            paymentType,
            success: charge.paid,
            failedReason: charge.failure_message,
            failedCode: charge.failure_code || charge.outcome?.reason || null,
            receiptUrl,
            amount: charge.amount,
            paymentMethodId,
            paymentIntentId,
            feeAmount,
            stripeChargeId: charge.id,
        });
        console.log(`[STRIPE WEBHOOK] Plan charge ${charge.id} processed successfully`);
        return;
    }

    if (metadata.registrationId) {
        await handleStripeTicketCharge({
            registrationId: metadata.registrationId,
            locationId: metadata.locationId,
            memberId: metadata.memberId,
            paymentType,
            success: charge.paid,
            failedReason: charge.failure_message,
            failedCode: charge.failure_code || charge.outcome?.reason || null,
            amount: charge.amount,
            paymentMethodId,
            paymentIntentId,
            feeAmount: charge.application_fee_amount || 0,
            stripeChargeId: charge.id,
        });
    }
}




async function handlePaymentIntentFailure(event: Stripe.Event) {
    const paymentIntent = event.data.object as unknown as Stripe.PaymentIntent;
    const stripeAccountId = event.account;
    console.log(`[STRIPE WEBHOOK] Payment Intent Failure ${event.type}:`, paymentIntent.id, stripeAccountId);
    const metadata = paymentIntent.metadata as unknown as StripeMetadata;

    if (!metadata.locationId || !metadata.memberId) {
        throw new Error("Stripe payment intent is missing required billing metadata");
    }

    const lastPaymentError = paymentIntent.last_payment_error;
    if (!lastPaymentError) {
        throw new Error("Stripe payment intent is missing last payment error");
    }

    const paymentMethod = lastPaymentError?.payment_method;


    const paymentMethodId = paymentMethod?.id || null;
    const paymentType: PaymentType = paymentMethod?.type === "us_bank_account" ? "us_bank_account" : "card";
    const failedReason = event.type === "payment_intent.canceled"
        ? paymentIntent.cancellation_reason || lastPaymentError?.message || "canceled"
        : lastPaymentError?.message || null;
    const failedCode = lastPaymentError?.code
        || lastPaymentError?.decline_code
        || (event.type === "payment_intent.canceled" ? "canceled" : null);


    if (metadata.invoiceId && metadata.memberPlanId) {

        await handleStripePlanCharge({
            invoiceId: metadata.invoiceId,
            memberPlanId: metadata.memberPlanId,
            locationId: metadata.locationId,
            memberId: metadata.memberId,
            paymentType,
            success: false,
            failedReason,
            failedCode,
            receiptUrl: null,
            amount: paymentIntent.amount,
            paymentMethodId,
            paymentIntentId: paymentIntent.id || null,
            feeAmount: 0,
        });
        console.log(`[STRIPE WEBHOOK] Plan charge ${paymentIntent.id} failed`);
        return;
    }

    if (metadata.orderId) {
        await handleStripeOrderCharge({
            orderId: metadata.orderId,
            locationId: metadata.locationId,
            memberId: metadata.memberId,
            paymentType,
            success: false,
            failedReason,
            failedCode,
            amount: paymentIntent.amount,
            paymentMethodId,
            paymentIntentId: paymentIntent.id || null,
            feeAmount: 0,
            stripeChargeId: null,
        });
        console.log(`[STRIPE WEBHOOK] Order charge ${paymentIntent.id} failed`);
        return;
    }

}
