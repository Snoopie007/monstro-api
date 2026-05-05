import { Elysia, t } from "elysia";
import Stripe from "stripe";
import { VendorStripePayments } from "@/libs/stripe";
import { db } from "@/db/db";
import {
    memberInvoices, memberSubscriptions, memberPackages,
    transactions, memberLocations
} from "@subtrees/schemas";
import type { PaymentType } from "@subtrees/types";
import { and, eq } from "drizzle-orm";


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
    invoiceId: string;
    memberPlanId: string;
};

export function stripeWebhookRoutes(app: Elysia) {

    app.post('/connected/stripe', async ({ body, headers, request, status }) => {

        const signature = headers["stripe-signature"];

        if (typeof signature !== "string") {
            throw new Error("Stripe Hook Signature is not a string");
        }
        if (!process.env.STRIPE_CONNECTED_WEBHOOK_SECRET) {
            throw new Error("Stripe Member webhook secret not found");
        }

        let event: Stripe.Event;
        try {
            const rawText = await request.text();
            event = await stripe.constructEventAsync(
                Buffer.from(rawText),
                signature,
                process.env.STRIPE_CONNECTED_WEBHOOK_SECRET
            );
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
    if (!metadata.invoiceId && typeof charge.payment_intent === "string") {
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

    const {
        locationId,
        memberId,
        invoiceId,
        memberPlanId,
    } = metadata;

    if (!locationId || !memberId || !invoiceId) {
        throw new Error("Stripe charge is missing required billing metadata");
    }

    const isPackage = memberPlanId?.startsWith("pkg_") ?? false;
    const now = new Date();

    let paymentType: PaymentType = "card";
    if (paymentMethodDetails?.type === "us_bank_account") {
        paymentType = "us_bank_account";
    }


    const [invoice] = await db.update(memberInvoices).set({
        status: charge.paid ? "paid" : "unpaid",
        paid: charge.paid,
        receiptUrl: charge.receipt_url,
        updated: now,
    }).where(eq(memberInvoices.id, invoiceId)).returning({
        description: memberInvoices.description,
        currency: memberInvoices.currency,
        total: memberInvoices.total,
        subTotal: memberInvoices.subTotal,
        tax: memberInvoices.tax,
        items: memberInvoices.items,
    });


    if (!invoice) {
        throw new Error("Invoice not found");
    }

    const transactionValues = {
        ...invoice,
        invoiceId,
        total: charge.amount,
        items: invoice.items ?? [],
        type: "inbound" as const,
        status: charge.paid ? "paid" as const : "failed" as const,
        failedReason: charge.failure_message,
        failedCode: charge.failure_code || charge.outcome?.reason || null,
        locationId,
        memberId,
        paymentMethodId: charge.payment_method,
        paymentIntentId: typeof charge.payment_intent === "string" ? charge.payment_intent : null,
        paymentType,
        chargeDate: now,
        feeAmount: charge.application_fee_amount || 0,
        metadata: {
            ...metadata,
            gatewayService: "stripe",
            chargeId: charge.id,
            stripeChargeId: charge.id,
            paymentIntentId: typeof charge.payment_intent === "string" ? charge.payment_intent : null,
            memberPlanId,
        }
    };

    const existingTransaction = await db.query.transactions.findFirst({
        where: (transaction, { eq }) => eq(transaction.invoiceId, invoiceId),
    });

    if (existingTransaction) {
        await db.update(transactions).set(transactionValues).where(eq(transactions.id, existingTransaction.id));
    } else {
        await db.insert(transactions).values(transactionValues);
    }

    const isActive = charge.paid;
    await db.transaction(async (tx) => {

        if (isPackage && isActive) {
            await tx.update(memberPackages).set({
                status: "active",
            }).where(eq(memberPackages.id, memberPlanId));
        } else if (memberPlanId) {
            await tx.update(memberSubscriptions).set({
                gatewayPaymentId: charge.payment_method,
                status: isActive ? "active" : "past_due",
            }).where(eq(memberSubscriptions.id, memberPlanId));
        }
        if (isActive) {
            await tx.update(memberLocations).set({
                status: "active",
            }).where(and(eq(memberLocations.memberId, memberId),
                eq(memberLocations.locationId, locationId)));
        }
    });
}

async function handlePaymentIntentFailure(event: Stripe.Event) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const stripeAccountId = event.account;
    console.log(`[STRIPE WEBHOOK] Payment Intent Failure ${event.type}:`, paymentIntent.id, stripeAccountId);
    const metadata = paymentIntent.metadata as unknown as StripeMetadata;
    const {
        locationId,
        memberId,
        invoiceId,
        memberPlanId,
    } = metadata;
    const now = new Date();

    const [invoice] = await db.update(memberInvoices).set({
        status: "unpaid",
        paid: false,
        updated: now,
    }).where(eq(memberInvoices.id, invoiceId)).returning({
        description: memberInvoices.description,
        currency: memberInvoices.currency,
        total: memberInvoices.total,
        subTotal: memberInvoices.subTotal,
        tax: memberInvoices.tax,
        items: memberInvoices.items,
    });

    if (!invoice) {
        throw new Error("Invoice not found for payment intent failure");
    }

    const lastPaymentError = paymentIntent.last_payment_error;
    const paymentMethodType = lastPaymentError?.payment_method?.type || paymentIntent.payment_method_types?.[0] || "card";
    const paymentType: PaymentType = paymentMethodType === "us_bank_account" ? "us_bank_account" : "card";
    const failedReason = event.type === "payment_intent.canceled"
        ? paymentIntent.cancellation_reason || lastPaymentError?.message || "canceled"
        : lastPaymentError?.message || null;
    const failedCode = lastPaymentError?.code
        || lastPaymentError?.decline_code
        || (event.type === "payment_intent.canceled" ? "canceled" : null);

    const existingTransaction = await db.query.transactions.findFirst({
        where: (transaction, { eq: equal }) => equal(transaction.invoiceId, invoiceId),
    });

    const values = {
        ...invoice,
        total: paymentIntent.amount,
        items: invoice.items ?? [],
        type: "inbound" as const,
        status: "failed" as const,
        failedReason,
        failedCode,
        locationId,
        memberId,
        invoiceId,
        paymentMethodId: typeof paymentIntent.payment_method === "string" ? paymentIntent.payment_method : null,
        paymentType,
        chargeDate: now,
        feeAmount: paymentIntent.application_fee_amount || 0,
        metadata: {
            ...metadata,
            gatewayService: "stripe",
            paymentIntentId: paymentIntent.id,
            memberPlanId,
        },
        updated: now,
    };

    if (existingTransaction) {
        await db.update(transactions).set(values).where(eq(transactions.id, existingTransaction.id));
    } else {
        await db.insert(transactions).values(values);
    }

    if (memberPlanId && !memberPlanId.startsWith("pkg_")) {
        await db.update(memberSubscriptions).set({
            status: "past_due",
        }).where(eq(memberSubscriptions.id, memberPlanId));
    }
}
