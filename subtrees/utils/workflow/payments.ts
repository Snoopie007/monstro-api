// Workflow eligibility only. These checks never change billing status or retry policy.
const stripeDeclines = new Set([
    "card_declined", "generic_decline", "insufficient_funds", "do_not_honor",
    "lost_card", "stolen_card", "expired_card", "incorrect_cvc", "incorrect_number",
    "fraudulent", "restricted_card", "pickup_card", "transaction_not_allowed",
]);
const squareDeclines = new Set([
    "CARD_DECLINED", "GENERIC_DECLINE", "INSUFFICIENT_FUNDS", "CVV_FAILURE",
    "ADDRESS_VERIFICATION_FAILURE", "CARD_EXPIRED", "EXPIRATION_FAILURE",
    "INVALID_ACCOUNT", "CARD_NOT_SUPPORTED", "TRANSACTION_LIMIT",
]);

export function isPaymentDecline(
    provider: unknown,
    code: unknown,
    providerStatus?: unknown,
    responseCode?: unknown,
): boolean {
    if (provider === "authorize") return providerStatus
        ? providerStatus === "declined" || providerStatus === "failedReview"
        : responseCode === "2";
    if (provider === "stripe") return typeof code === "string" && stripeDeclines.has(code);
    if (provider === "square") return providerStatus === "FAILED" || (typeof code === "string" && squareDeclines.has(code));
    return false;
}

type Failure = {
    status: "failed";
    failureCode: string;
    failureReason: string;
    paymentIntentId?: string;
    gatewayMetadata: Record<string, unknown>;
    brand?: string;
    last4?: string;
};

// Only the provider error fields used by workflow eligibility.
type ProviderError = {
    name?: string;
    type?: string;
    code?: string;
    decline_code?: string;
    message?: string;
    transactionId?: string;
    payment_intent?: null | string | {
        id?: string;
        last_payment_error?: { decline_code?: string };
    };
    errors?: Array<{ code?: string; detail?: string }>;
    body?: { errors?: Array<{ code?: string; detail?: string }>; payment?: { id?: string; status?: string } };
    response?: { errors?: Array<{ code?: string; detail?: string }>; payment?: { id?: string; status?: string } };
};

/** Keep thrown declines on the operation's existing failure-writing path.
 * Unknown errors return null so the caller can preserve its original error handling.
 */
export function paymentFailureFromError(error: unknown): Failure | null {
    if (!error || typeof error !== "object") return null;
    const value = error as ProviderError;
    if (value.type === "StripeCardError") {
        const lastError = value.payment_intent && typeof value.payment_intent === "object"
            ? value.payment_intent.last_payment_error : undefined;
        // Prefer a recognized detailed code. Empty or unfamiliar details must not hide card_declined.
        const code = [
            value.decline_code,
            lastError?.decline_code,
            value.code,
        ].find(candidate => isPaymentDecline("stripe", candidate));
        if (!code) return null;
        return {
            status: "failed", failureCode: code, failureReason: value.message ?? "Card declined",
            paymentIntentId: typeof value.payment_intent === "string" ? value.payment_intent : value.payment_intent?.id,
            gatewayMetadata: { gatewayService: "stripe" },
        };
    }
    if (value.name === "AuthorizeNetApiError" && value.code === "2") {
        return {
            status: "failed", failureCode: "2", failureReason: value.message ?? "Payment declined",
            paymentIntentId: value.transactionId,
            gatewayMetadata: { gatewayService: "authorize", authorizeResponseCode: "2" },
        };
    }
    const body = value.body ?? value.response;
    const errors = body?.errors ?? value.errors;
    const decline = Array.isArray(errors) ? errors.find(entry => isPaymentDecline("square", entry?.code)) : undefined;
    if (!decline && body?.payment?.status !== "FAILED") return null;
    return {
        status: "failed", failureCode: decline?.code ?? "SQUARE_PAYMENT_FAILED", failureReason: decline?.detail ?? "Payment failed",
        paymentIntentId: body?.payment?.id,
        gatewayMetadata: { gatewayService: "square", squareErrorCode: decline?.code, squarePaymentStatus: body?.payment?.status },
    };
}
