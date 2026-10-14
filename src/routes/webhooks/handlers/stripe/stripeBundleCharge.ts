import { isPaymentDecline } from "@/subtrees/utils/workflow/payments";
import { onInvoicePaid, recordBundleDecline } from "@/routes/x/loc/addonsBundles/bundleSettlement";

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

/** Settles or declines a bundle invoice from a Stripe charge or PaymentIntent event. */
export async function handleStripeBundleCharge(props: HandleStripeBundleChargeProps) {
    const { invoiceId, paymentIntentId, failedCode } = props;
    const attemptId = props.billingAttemptId ?? undefined;

    if (!paymentIntentId) throw new Error(`Stripe payment for bundle invoice ${invoiceId} has no PaymentIntent`);

    if (props.success) {
        await onInvoicePaid({
            invoiceId,
            attemptId,
            paymentIntentId,
            amount: props.amount,
            currency: props.currency,
            gateway: { service: "stripe", accountId: props.stripeAccountId, customerId: props.customerId, paymentMethodId: props.paymentMethodId },
            receiptUrl: props.receiptUrl,
        });
        return;
    }

    await recordBundleDecline({
        invoiceId,
        attemptId,
        paymentIntentId,
        reason: props.failedReason ?? "Payment failed",
        code: failedCode ?? "payment_failed",
        workflowDecline: isPaymentDecline("stripe", failedCode),
        amount: props.amount, currency: props.currency,
        gateway: { service: "stripe", stripeAccountId: props.stripeAccountId, customerId: props.customerId, paymentMethodId: props.paymentMethodId },
    });
}
