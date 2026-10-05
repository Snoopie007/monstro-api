import { createHash } from "node:crypto";

type AttemptMetadata = Record<string, unknown>;
type InvoiceMetadata = Record<string, unknown> | null | undefined;

/** Build only the attempt-related update; callers retain their transaction and invoice locks. */
function invoiceAttemptOutcome(
    metadata: InvoiceMetadata,
    attempt: AttemptMetadata | undefined,
    status: "succeeded" | "failed",
    paymentIntentId: string | undefined,
): { metadata?: Record<string, unknown> } {
    if (!attempt) return {};
    return { metadata: { ...metadata, billingAttempt: { ...attempt, status, paymentIntentId } } };
}

/** A Square callback must match the locked invoice's current attempt before any writes. */
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

/** Recover a response-lost Authorize charge only when its reference identifies this attempt. */
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

/** Prepare the invoice outcome after locking, without performing or reordering any writes. */
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
