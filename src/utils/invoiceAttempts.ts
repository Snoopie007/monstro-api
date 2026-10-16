import type { db } from "@/db/db";
import { memberSubscriptions } from "@/subtrees/schemas";
import { getDeferredBilling } from "@/subtrees/utils/deferredBilling";
import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";

/** Read the subscription settings so new callback rules apply only to deferred billing. */
export async function getDeferredInvoiceBilling(tx: Pick<typeof db, "query">, subscriptionId: string | null | undefined) {
    if (!subscriptionId) return null;
    const subscription = await tx.query.memberSubscriptions.findFirst({
        where: eq(memberSubscriptions.id, subscriptionId), columns: { metadata: true },
    });
    return getDeferredBilling(subscription?.metadata);
}

type AttemptMetadata = Record<string, unknown>;
type InvoiceMetadata = Record<string, unknown> | null | undefined;

/** Build the payment attempt update. The caller locks the invoice and saves the result. */
function invoiceAttemptOutcome(
    metadata: InvoiceMetadata,
    attempt: AttemptMetadata | undefined,
    status: "succeeded" | "failed",
    paymentIntentId: string | undefined,
): { metadata?: Record<string, unknown> } {
    if (!attempt) return {};
    return { metadata: { ...metadata, billingAttempt: { ...attempt, status, paymentIntentId } } };
}

/** Check the Square result against the current payment attempt. Return null for an old result or an already paid invoice. */
export function prepareSquareInvoiceAttempt(
    invoice: { metadata: InvoiceMetadata; paid: boolean | null; total: number },
    amount: number,
    paymentIntentId: string | undefined,
    outcome: "succeeded" | "failed",
) {
    const attempt = invoice.metadata?.billingAttempt as {
        status?: string; paymentIntentId?: string; paymentMethodId?: string;
    } | undefined;
    if (attempt) {
        if (invoice.paid || attempt.status === "succeeded") return null;
        if (attempt.paymentIntentId && attempt.paymentIntentId !== paymentIntentId) return null;
        if (amount !== invoice.total) throw new Error("Square payment amount does not match invoice");
    }
    return {
        ...invoiceAttemptOutcome(invoice.metadata, attempt, outcome, paymentIntentId),
        paymentMethodId: attempt?.paymentMethodId,
    };
}

/** If the original Authorize.net response was lost, use its invoice reference to identify the payment attempt. */
function matchesAuthorizeInvoiceAttempt(
    invoice: { paid: boolean | null } | undefined,
    attempt: AttemptMetadata,
    paymentIntentId: string,
    invoiceNumber: string | undefined,
) {
    if (typeof attempt.id !== "string") return true;
    if (invoice?.paid || attempt.status === "succeeded") return false;
    if (typeof attempt.paymentIntentId === "string") return attempt.paymentIntentId === paymentIntentId;
    const reference = createHash("sha256").update(attempt.id).digest("hex").slice(0, 20);
    return invoiceNumber === reference;
}

/** Build updates for the matching Authorize.net payment result. The caller must lock the invoice before calling and save the updates afterward. */
export function prepareAuthorizeInvoiceAttempt(
    invoice: { metadata: InvoiceMetadata; paid: boolean | null; memberPlanId: string | null } | undefined,
    payment: { id: string; invoiceNumber?: string; status: "paid" | "failed" | "pending" },
) {
    const metadata = invoice?.metadata ?? {};
    const rawAttempt = metadata.billingAttempt;
    const attempt = rawAttempt && typeof rawAttempt === "object" && !Array.isArray(rawAttempt)
        ? rawAttempt as AttemptMetadata : {};
    if (!matchesAuthorizeInvoiceAttempt(invoice, attempt, payment.id, payment.invoiceNumber)) return null;
    return {
        invoiceUpdate: invoiceAttemptOutcome(metadata, attempt.id ? attempt : undefined,
            payment.status === "paid" ? "succeeded" : "failed", payment.id),
        subscriptionId: attempt.id ? invoice?.memberPlanId : null,
    };
}
