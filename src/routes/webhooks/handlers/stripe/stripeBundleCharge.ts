import { isPaymentDecline } from "@/subtrees/utils/workflow/payments";
import { recordBundlePayment } from "@/handlers/addonsBundles/checkout/settlement";

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
        await recordBundlePayment({
            status: "succeeded",
            invoiceId,
            attemptId,
            paymentIntentId,
            amount: props.amount,
            currency: props.currency,
            gateway: { service: "stripe", stripeAccountId: props.stripeAccountId, customerId: props.customerId, paymentMethodId: props.paymentMethodId },
            receiptUrl: props.receiptUrl,
        });
        return;
    }

    await recordBundlePayment({
        status: "failed",
        invoiceId,
        attemptId,
        paymentIntentId,
        reason: props.failedReason ?? "Payment failed",
        code: failedCode ?? "payment_failed",
        retryable: true,
        workflowDecline: isPaymentDecline("stripe", failedCode),
        amount: props.amount, currency: props.currency,
        gateway: { service: "stripe", stripeAccountId: props.stripeAccountId, customerId: props.customerId, paymentMethodId: props.paymentMethodId },
    });
}
