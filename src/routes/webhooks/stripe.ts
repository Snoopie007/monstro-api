import { recordInvoicePayment } from "@/subtrees/utils/server/invoicePayments";
import { bundleInvoicePaymentOwner } from "@/routes/x/loc/addonsBundles/bundleSettlement";
import { memberInvoices } from "@/subtrees/schemas";
import { Elysia, t } from "elysia";
import Stripe from "stripe";
import { VendorStripePayments } from "@/libs/stripe";
import { db } from "@/db/db";
import { memberLocations } from "@/subtrees/schemas";
import type { PaymentType } from "@/subtrees/types";
import { and, eq } from "drizzle-orm";
import { handleStripeBundleCharge, handleStripeOrderCharge, handleStripePlanCharge } from "@/routes/webhooks/handlers/stripe";
import { isBundleInvoice } from "@/routes/x/loc/addonsBundles/bundleSettlement";

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
    "payment_intent.processing",
    "payment_intent.requires_action",
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
    billingAttemptId?: string;
    orderId?: string;
};

function stripePaymentType(type: string | null | undefined): PaymentType {
    if (type === "card" || type === "us_bank_account" || type === "link" || type === "cashapp") return type;
    throw new Error(`Unsupported Stripe payment method type: ${type || "unknown"}`);
}

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
        try {
            await processEvent(event);
        } catch (err) {
            console.error("[STRIPE WEBHOOK] Failed to process event:", err);
            return status(500, { error: "[STRIPE WEBHOOK] Failed to process event" });
        }
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

            case "payment_intent.succeeded":
            case "payment_intent.processing":
            case "payment_intent.requires_action":
                await handleBundlePaymentIntent(event);
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


    const paymentType = stripePaymentType(paymentMethodDetails?.type);
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

    if (!metadata.memberPlanId && metadata.invoiceId && await isBundleInvoice(metadata.invoiceId)) {
        await handleStripeBundleCharge({
            invoiceId: metadata.invoiceId,
            billingAttemptId: metadata.billingAttemptId ?? null,
            customerId: typeof charge.customer === "string" ? charge.customer : charge.customer?.id,
            paymentMethodId: charge.payment_method ?? undefined,
            success: charge.paid,
            amount: charge.amount,
            currency: charge.currency,
            paymentIntentId,
            stripeAccountId: event.account ?? null,
            receiptUrl,
            failedReason: charge.failure_message,
            failedCode: charge.failure_code || charge.outcome?.reason || null,
        });
        console.log(`[STRIPE WEBHOOK] Bundle charge ${charge.id} processed successfully`);
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
            currency: charge.currency,
            paymentMethodId,
            paymentIntentId,
            feeAmount,
            stripeAccountId: event.account ?? null,
            billingAttemptId: metadata.billingAttemptId ?? null,
        });
        console.log(`[STRIPE WEBHOOK] Plan charge ${charge.id} processed successfully`);
        return;
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
    const paymentType = stripePaymentType(paymentMethod?.type);
    const failedReason = event.type === "payment_intent.canceled"
        ? paymentIntent.cancellation_reason || lastPaymentError?.message || "canceled"
        : lastPaymentError?.message || null;
    const failedCode = lastPaymentError?.code
        || lastPaymentError?.decline_code
        || (event.type === "payment_intent.canceled" ? "canceled" : null);

    if (!metadata.memberPlanId && metadata.invoiceId && await isBundleInvoice(metadata.invoiceId)) {
        await handleStripeBundleCharge({
            invoiceId: metadata.invoiceId,
            billingAttemptId: metadata.billingAttemptId ?? null,
            customerId: typeof paymentIntent.customer === "string" ? paymentIntent.customer : paymentIntent.customer?.id,
            paymentMethodId: typeof paymentIntent.payment_method === "string" ? paymentIntent.payment_method : paymentIntent.payment_method?.id,
            success: false,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            paymentIntentId: paymentIntent.id || null,
            stripeAccountId: event.account ?? null,
            receiptUrl: null,
            failedReason,
            failedCode,
        });
        console.log(`[STRIPE WEBHOOK] Bundle charge ${paymentIntent.id} failed`);
        return;
    }

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
            currency: paymentIntent.currency,
            paymentMethodId,
            paymentIntentId: paymentIntent.id || null,
            feeAmount: 0,
            stripeAccountId: event.account ?? null,
            billingAttemptId: metadata.billingAttemptId ?? null,
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

async function handleBundlePaymentIntent(event: Extract<Stripe.Event, {
    type: "payment_intent.succeeded" | "payment_intent.processing" | "payment_intent.requires_action";
}>) {
    const intent = event.data.object;
    const invoiceId = intent.metadata.invoiceId;
    if (!invoiceId || !await isBundleInvoice(invoiceId)) return;
    const invoice = await db.query.memberInvoices.findFirst({ where: eq(memberInvoices.id, invoiceId) });
    if (!invoice || intent.metadata.locationId !== invoice.locationId || intent.metadata.memberId !== invoice.memberId) throw new Error("Stripe bundle invoice ownership does not match");
    const customerId = typeof intent.customer === "string" ? intent.customer : intent.customer?.id;
    if (!customerId) throw new Error("Stripe bundle payment has no customer binding");
    const gateway = { service: "stripe" as const, stripeAccountId: event.account ?? null, customerId, paymentMethodId: typeof intent.payment_method === "string" ? intent.payment_method : intent.payment_method?.id };
    if (intent.status === "succeeded") {
        await recordInvoicePayment(db, { status: "succeeded", invoiceId, attemptId: intent.metadata.billingAttemptId, paymentIntentId: intent.id, amount: intent.amount_received, currency: intent.currency, gateway }, bundleInvoicePaymentOwner);
    } else if (intent.status === "processing" || intent.status === "requires_action") {
        await recordInvoicePayment(db, { status: intent.status, invoiceId, attemptId: intent.metadata.billingAttemptId, paymentIntentId: intent.id, gateway }, bundleInvoicePaymentOwner);
    }
}
