import { db } from "@/db/db";
import { integrations, memberInvoices } from "@/subtrees/schemas";
import { recordInvoicePayment, type InvoicePaymentOutcome } from "@/subtrees/utils/server/invoicePayments";
import { isPaymentDecline } from "@/subtrees/utils/workflow/payments";
import { bundleInvoicePaymentOwner, readBundleInvoice } from "@/routes/x/loc/addonsBundles/bundleSettlement";
import { and, eq } from "drizzle-orm";

type SquareBinding = {
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

async function recordSquareBundle(input: SquareBinding, outcome: InvoicePaymentOutcome) {
    const invoice = await db.query.memberInvoices.findFirst({ where: eq(memberInvoices.id, input.invoiceId) });
    if (!invoice) throw new Error("Square invoice was not found");
    const binding = readBundleInvoice(invoice.metadata);
    const integration = await db.query.integrations.findFirst({ where: and(eq(integrations.id, binding.gatewayIntegrationId), eq(integrations.locationId, invoice.locationId)) });
    if (!integration || integration.service !== "square" || !input.locationId || integration.metadata?.squareLocationId !== input.locationId
        || !input.customerId || input.customerId !== binding.billingAttempt?.gatewayCustomerId) throw new Error("Square payment binding does not match the invoice");
    if (input.amount !== invoice.total || input.currency?.toUpperCase() !== invoice.currency?.toUpperCase()) throw new Error("Square payment amount or currency does not match the invoice");
    return recordInvoicePayment(db, {
        ...outcome, invoiceId: input.invoiceId, attemptId: input.billingAttemptId,
        gateway: { service: "square", integrationId: integration.id, customerId: input.customerId },
    }, bundleInvoicePaymentOwner);
}

export async function handleSquareBundleSuccess(input: SquareBinding & { receiptUrl: string | null }) {
    if (!input.squarePaymentId || !input.currency) throw new Error("Square bundle payment has no id or currency");
    return recordSquareBundle(input, { status: "succeeded", paymentIntentId: input.squarePaymentId, amount: input.amount, currency: input.currency, receiptUrl: input.receiptUrl, gatewayMetadata: { squarePaymentId: input.squarePaymentId }, brand: input.brand, last4: input.last4, paymentType: "card" });
}

export async function handleSquareBundleFail(input: SquareBinding & {
    squarePaymentStatus: string | undefined;
    failedReason: string;
    failedCode: string;
}) {
    return recordSquareBundle(input, { status: "failed", paymentIntentId: input.squarePaymentId, reason: input.failedReason, code: input.failedCode, retryable: true, workflowDecline: isPaymentDecline("square", input.failedCode, input.squarePaymentStatus) });
}

export async function handleSquareBundleProcessing(input: SquareBinding) {
    return recordSquareBundle(input, { status: "processing", paymentIntentId: input.squarePaymentId });
}
