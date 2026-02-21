import { Elysia, t } from "elysia";
import Stripe from "stripe";
import { MemberStripePayments } from "@/libs/stripe";
import { db } from "@/db/db";
import { memberInvoices, memberSubscriptions, memberPackages, transactions } from "@subtrees/schemas";
import type { PaymentType } from "@subtrees/types";
import { eq } from "drizzle-orm";
/**
 * Stripe Webhook Handler for Member Billing Events
 *
 * This webhook handles various Stripe events related to member billing:
 *
 */


const allowedEvents: Stripe.Event.Type[] = [
    'payment_intent.payment_failed',
    "payment_intent.canceled",
    "payment_intent.succeeded",
    "application_fee.created",
    "application_fee.refunded",
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
            const rawText = await request.text();
            event = await stripe.constructEventAsync(
                Buffer.from(rawText),
                signature,
                process.env.STRIPE_WEBHOOK_SECRET
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
            case "charge.succeeded":
            case "charge.failed":
                await handleCharge(event);
                break;

            case "payment_intent.canceled":
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

type StripeMetadata = {
    locationId: string;
    memberId: string;
    invoiceId: string;
    memberPlanId: string;
}

async function handleCharge(event: Stripe.Event) {

    const charge = event.data.object as Stripe.Charge;
    console.log(`[STRIPE WEBHOOK] Charge ${event.type}:`, charge.id);
    const paymentMethodDetails = charge.payment_method_details;
    const {
        locationId,
        memberId,
        invoiceId,
        memberPlanId,
    } = charge.metadata as unknown as StripeMetadata;

    const isPackage = memberPlanId.startsWith("pkg_");
    const now = new Date();

    let paymentType: PaymentType = "card";
    if (paymentMethodDetails?.type === "card") {
        paymentType = "card";
    } else if (paymentMethodDetails?.type === "us_bank_account") {
        paymentType = "us_bank_account";
    }


    const [invoice] = await db.update(memberInvoices).set({
        status: charge.paid ? "paid" : "unpaid",
        paid: charge.paid,
        stripeReceiptUrl: charge.receipt_url,
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

    await db.insert(transactions).values({
        ...invoice,
        total: charge.amount,
        items: invoice.items ?? [],
        type: "inbound",
        status: charge.paid ? "paid" : "failed",
        ...(charge.paid ? {} : {
            failedReason: charge.failure_message,
            failedCode: charge.failure_code,
        }),
        locationId,
        memberId,
        paymentMethodId: charge.payment_method,
        paymentType,
        chargeDate: now,
        applicationFeeAmount: charge.application_fee_amount || 0,
        metadata: {
            memberPlanId,
        }
    });

    if (isPackage && charge.paid) {
        await db.update(memberPackages).set({
            status: "active",
        }).where(eq(memberPackages.id, memberPlanId));
    } else {
        await db.update(memberSubscriptions).set({
            stripePaymentId: charge.payment_method,
            status: charge.paid ? "active" : "past_due",
        }).where(eq(memberSubscriptions.id, memberPlanId));
    }


}
