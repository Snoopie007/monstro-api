import { db } from "@/db/db";
import { integrations, memberInvoices } from "@/subtrees/schemas";
import type { InvoicePaymentOutcome } from "@/subtrees/utils/server/bundlePayments";
import { isPaymentDecline } from "@/subtrees/utils/workflow/payments";
import { getBundleBinding, recordBundlePayment } from "@/handlers/addonsBundles/checkout/settlement";
import { and, eq } from "drizzle-orm";
import type { SquareWebhookPayment } from "./type";
import { ALLOWED_EVENTS, getSquareFailureCode, getSquareFailureReason, parseNote } from "./utils";

type SquarePaymentFields = {
    invoiceId: string;
    squarePaymentId: string | undefined;
    billingAttemptId?: string;
    locationId?: string;
    customerId?: string;
    amount: number;
    currency: string | undefined;
    brand?: string;
    last4?: string;
};

/** Proves a Square payment belongs to this invoice, then hands it to the
 * shared recorder. Any mismatch throws, so Square redelivers the event. */
async function recordSquareOutcome(input: SquarePaymentFields, outcome: InvoicePaymentOutcome) {
    // Square echoes the invoice id we sent as the payment's reference_id.
    const invoice = await db.query.memberInvoices.findFirst({ where: eq(memberInvoices.id, input.invoiceId) });
    if (!invoice) throw new Error("Square invoice was not found");

    // The Square integration and customer this invoice was charged through.
    const binding = getBundleBinding(invoice.metadata);

    // The payment must come from that integration's Square location, so a
    // payment from another merchant or location can't settle this invoice.
    const integration = await db.query.integrations.findFirst({ where: and(eq(integrations.id, binding.gatewayIntegrationId), eq(integrations.locationId, invoice.locationId)) });
    if (!integration || integration.service !== "square" || !input.locationId || integration.metadata?.squareLocationId !== input.locationId) {
        throw new Error("Square payment binding does not match the invoice");
    }

    // It must also charge the same Square customer as the current attempt.
    if (!input.customerId || input.customerId !== binding.billingAttempt?.gatewayCustomerId) {
        throw new Error("Square payment binding does not match the invoice");
    }

    // A different amount or currency never settles the invoice.
    if (input.amount !== invoice.total || input.currency?.toUpperCase() !== invoice.currency?.toUpperCase()) throw new Error("Square payment amount or currency does not match the invoice");

    // The recorder matches the attempt id from the payment note, ignores stale
    // or repeated events, and saves the payment with the bundle's access in one transaction.
    return recordBundlePayment({
        ...outcome, invoiceId: input.invoiceId, attemptId: input.billingAttemptId,
        gateway: { service: "square", integrationId: integration.id, customerId: input.customerId },
    });
}

export async function handleSquareBundleSuccess(input: SquarePaymentFields & { receiptUrl: string | null }) {
    if (!input.squarePaymentId || !input.currency) throw new Error("Square bundle payment has no id or currency");
    return recordSquareOutcome(input, { status: "succeeded", paymentIntentId: input.squarePaymentId, amount: input.amount, currency: input.currency, receiptUrl: input.receiptUrl, gatewayMetadata: { squarePaymentId: input.squarePaymentId }, brand: input.brand, last4: input.last4, paymentType: "card" });
}

/** Every Square payment status for a bundle or add-on invoice. Ordinary invoices
 * go through processSquareEvent instead. */
export async function processSquareBundleEvent(event: { type?: string; data?: { object?: { payment?: SquareWebhookPayment } } }) {
    const payment = event.data?.object?.payment;
    if (!event.type || !ALLOWED_EVENTS.includes(event.type) || !payment?.reference_id) return;

    // The payment fields every outcome checks against the invoice. Only squarePaymentId is saved.
    const fields: SquarePaymentFields = {
        invoiceId: payment.reference_id,
        squarePaymentId: payment.id,
        billingAttemptId: parseNote(payment.note ?? "").billingAttemptId,
        locationId: payment.location_id,
        customerId: payment.customer_id,
        amount: payment.total_money?.amount ?? 0,
        currency: payment.total_money?.currency,
    };
    const status = (payment.status || "").toUpperCase();

    switch (status) {
        case "COMPLETED":
            return handleSquareBundleSuccess({
                ...fields,
                receiptUrl: payment.receipt_url ?? null,
                brand: payment.card_details?.card?.card_brand,
                last4: payment.card_details?.card?.last_4,
            });
        case "PENDING":
        case "APPROVED":
            return recordSquareOutcome(fields, { status: "processing", paymentIntentId: payment.id });
        case "FAILED":
        case "CANCELED": {
            const code = getSquareFailureCode(payment, status);
            return recordSquareOutcome(fields, {
                status: "failed", paymentIntentId: payment.id, reason: getSquareFailureReason(payment, status), code,
                retryable: true, workflowDecline: isPaymentDecline("square", code, payment.status),
            });
        }
    }
}
