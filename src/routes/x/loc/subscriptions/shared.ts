import { isFuture } from "date-fns";
import type { MemberStripePayments } from "@/libs/stripe";
import type Stripe from "stripe";

export type PromoDiscount = {
    amount: number;
    duration: number;
    durationInMonths: number;
};

export async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

export function getDiscountDuration(promo: {
    duration: "once" | "repeating" | "forever";
    durationInMonths: number | null;
}): number {
    if (promo.duration === "once") return 1;
    if (promo.duration === "repeating") return promo.durationInMonths || 1;
    return Number.MAX_SAFE_INTEGER;
}

export function getNextBillingDate(sub: {
    currentPeriodEnd: Date;
    trialEnd: Date | null;
    status: string;
}): Date {
    if (sub.status === "trialing" && sub.trialEnd && isFuture(sub.trialEnd)) {
        return sub.trialEnd;
    }
    return sub.currentPeriodEnd;
}

type ResolvedStripePaymentMethod =
    | {
        ok: true;
        paymentMethod: Stripe.PaymentMethod & { type: "card" | "us_bank_account" };
    }
    | {
        ok: false;
        statusCode: number;
        error: string;
    };

type StripeLookupErrorLike = {
    type?: string;
    rawType?: string;
    statusCode?: number;
    code?: string;
};

function isStripePaymentMethodLookupInputError(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;

    const stripeError = error as StripeLookupErrorLike;
    return (
        stripeError.type === "StripeInvalidRequestError" ||
        stripeError.rawType === "invalid_request_error" ||
        stripeError.code === "resource_missing" ||
        stripeError.statusCode === 400 ||
        stripeError.statusCode === 404
    );
}

export async function resolveStripePaymentMethodForCustomer({
    stripe,
    stripeCustomerId,
    paymentMethodId,
    invalidMessage,
    unsupportedMessage,
    upstreamMessage = "Failed to validate payment method with Stripe",
    logLabel,
    logContext,
}: {
    stripe: MemberStripePayments;
    stripeCustomerId: string;
    paymentMethodId: string;
    invalidMessage: string;
    unsupportedMessage: string;
    upstreamMessage?: string;
    logLabel: string;
    logContext: Record<string, unknown>;
}): Promise<ResolvedStripePaymentMethod> {
    try {
        const paymentMethod = await stripe.retrievePaymentMethod(stripeCustomerId, paymentMethodId);

        if (paymentMethod.type !== "card" && paymentMethod.type !== "us_bank_account") {
            return { ok: false, statusCode: 400, error: unsupportedMessage };
        }

        return {
            ok: true,
            paymentMethod: paymentMethod as Stripe.PaymentMethod & { type: "card" | "us_bank_account" },
        };
    } catch (error) {
        if (isStripePaymentMethodLookupInputError(error)) {
            return { ok: false, statusCode: 400, error: invalidMessage };
        }

        console.error(logLabel, {
            ...logContext,
            message: error instanceof Error ? error.message : String(error),
            error,
        });

        return { ok: false, statusCode: 502, error: upstreamMessage };
    }
}
