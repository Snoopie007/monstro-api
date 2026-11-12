import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/db/db";
import { memberInvoices } from "@/subtrees/schemas";
import { isPaymentDecline } from "@/subtrees/utils/workflow/payments";
import { isCollectorInvoice, recordBundlePayment } from "@/handlers/addonsBundles/checkout/settlement";

interface HandleStripeBundleChargeProps {
    invoiceId: string;
    billingAttemptId: string | null;
    success: boolean;
    amount: number;
    currency: string;
    paymentIntentId: string | null;
    stripeAccountId: string | null;
    receiptUrl: string | null;
    customerId?: string;
    paymentMethodId?: string;
    failedReason: string | null;
    failedCode: string | null;
}

/** Settles or declines a bundle or add-on invoice from a Stripe charge or PaymentIntent event. */
export async function recordStripeOutcome(props: HandleStripeBundleChargeProps) {
    const { invoiceId, paymentIntentId, failedCode } = props;

    if (!paymentIntentId) throw new Error(`Stripe payment for bundle invoice ${invoiceId} has no PaymentIntent`);

    // The fields a success and a decline both record.
    const common = {
        invoiceId, attemptId: props.billingAttemptId ?? undefined, paymentIntentId, amount: props.amount, currency: props.currency,
        gateway: { service: "stripe" as const, stripeAccountId: props.stripeAccountId, customerId: props.customerId, paymentMethodId: props.paymentMethodId },
    };

    await recordBundlePayment(props.success
        ? { ...common, status: "succeeded", receiptUrl: props.receiptUrl }
        : { ...common, status: "failed", reason: props.failedReason ?? "Payment failed", code: failedCode ?? "payment_failed", retryable: true, workflowDecline: isPaymentDecline("stripe", failedCode) });
}

type BundleMetadata = { invoiceId?: string; memberPlanId?: string; billingAttemptId?: string };

// Subscription renewals carry a memberPlanId and settle through handleStripePlanCharge.
async function bundleInvoiceId(metadata: BundleMetadata) {
    if (metadata.memberPlanId || !metadata.invoiceId) return null;

    return await isCollectorInvoice(metadata.invoiceId) ? metadata.invoiceId : null;
}

/** Records a charge event for a bundle or add-on invoice. False when the charge pays for something else. */
export async function handleStripeBundleCharge(event: Stripe.Event, charge: Stripe.Charge, metadata: BundleMetadata) {
    const invoiceId = await bundleInvoiceId(metadata);
    if (!invoiceId) return false;

    await recordStripeOutcome({
        invoiceId,
        billingAttemptId: metadata.billingAttemptId ?? null,
        customerId: typeof charge.customer === "string" ? charge.customer : charge.customer?.id,
        paymentMethodId: charge.payment_method ?? undefined,
        success: charge.paid,
        amount: charge.amount,
        currency: charge.currency,
        paymentIntentId: typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id || null,
        stripeAccountId: event.account ?? null,
        receiptUrl: charge.receipt_url,
        failedReason: charge.failure_message,
        failedCode: charge.failure_code || charge.outcome?.reason || null,
    });
    return true;
}

/** Records a failed or canceled PaymentIntent for a bundle or add-on invoice. False when it pays for something else. */
export async function handleStripeBundleFailure(
    event: Stripe.Event,
    intent: Stripe.PaymentIntent,
    metadata: BundleMetadata,
    failure: { failedReason: string | null; failedCode: string | null },
) {
    const invoiceId = await bundleInvoiceId(metadata);
    if (!invoiceId) return false;

    await recordStripeOutcome({
        invoiceId,
        billingAttemptId: metadata.billingAttemptId ?? null,
        customerId: typeof intent.customer === "string" ? intent.customer : intent.customer?.id,
        paymentMethodId: typeof intent.payment_method === "string" ? intent.payment_method : intent.payment_method?.id,
        success: false,
        amount: intent.amount,
        currency: intent.currency,
        paymentIntentId: intent.id || null,
        stripeAccountId: event.account ?? null,
        receiptUrl: null,
        ...failure,
    });
    return true;
}

/** Records a bundle or add-on invoice's PaymentIntent progress: succeeded, processing
 * (such as a bank debit), or waiting on the customer (such as 3D Secure).
 * Declines arrive as charge.failed, payment_intent.payment_failed or
 * payment_intent.canceled instead. Any mismatch throws, so Stripe redelivers the event. */
export async function handleStripeBundleIntent(event: Extract<Stripe.Event, {
    type: "payment_intent.succeeded" | "payment_intent.processing" | "payment_intent.requires_action";
}>) {
    const intent = event.data.object;

    // Every collector charge, at bundle checkout or an add-on period, puts the
    // invoice id in the PaymentIntent's metadata. Other PaymentIntents skip these events.
    const invoiceId = intent.metadata.invoiceId;
    if (!invoiceId || !await isCollectorInvoice(invoiceId)) return;

    // The metadata's location and member must match the invoice, so a
    // PaymentIntent can't be pointed at someone else's invoice.
    const invoice = await db.query.memberInvoices.findFirst({ where: eq(memberInvoices.id, invoiceId) });
    if (!invoice || intent.metadata.locationId !== invoice.locationId || intent.metadata.memberId !== invoice.memberId) {
        throw new Error("Stripe bundle invoice ownership does not match");
    }

    const customerId = typeof intent.customer === "string" ? intent.customer : intent.customer?.id;
    if (!customerId) throw new Error("Stripe bundle payment has no customer binding");

    // The recorder checks the connected account, customer and payment method
    // against the invoice's current attempt.
    const gateway = {
        service: "stripe" as const,
        stripeAccountId: event.account ?? null,
        customerId,
        paymentMethodId: typeof intent.payment_method === "string" ? intent.payment_method : intent.payment_method?.id,
    };

    // The recorder matches the attempt id from the metadata and ignores stale or
    // repeated events. A late progress event never undoes a payment or a decline,
    // and this success is safe to record alongside the charge.succeeded event.
    if (intent.status === "succeeded") {
        // amount_received is what Stripe actually collected; the recorder requires it to equal the invoice total.
        await recordBundlePayment({ status: "succeeded", invoiceId, attemptId: intent.metadata.billingAttemptId, paymentIntentId: intent.id, amount: intent.amount_received, currency: intent.currency, gateway });
    } else if (intent.status === "processing" || intent.status === "requires_action") {
        await recordBundlePayment({ status: intent.status, invoiceId, attemptId: intent.metadata.billingAttemptId, paymentIntentId: intent.id, gateway });
    }
}
