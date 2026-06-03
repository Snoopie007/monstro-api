
import type { SquareError } from "square";
import { ErrorCategory, ErrorCode } from "square";
import Stripe from "stripe";


const PaymentErrorCodes = {
    INSUFFICIENT_FUNDS: "INSUFFICIENT_FUNDS",
    CARD_DECLINED: "CARD_DECLINED",
    EXPIRATION_FAILURE: "EXPIRATION_FAILURE",
    CARD_NOT_SUPPORTED: "CARD_NOT_SUPPORTED",
    UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

const PaymentErrorMessages = {
    INSUFFICIENT_FUNDS: "insufficient funds",
    CARD_DECLINED: "card declined",
    EXPIRATION_FAILURE: "card expired",
    CARD_NOT_SUPPORTED: "card not supported",
    UNKNOWN_ERROR: "unable to process payment",
} as const;

export function handleSquareError(error: SquareError): { code: string, message: string } {
    if (error.errors.length > 0) {
        const squareError = error.errors[0];
        if (!squareError) {
            return { code: "UNKNOWN_ERROR", message: error.message };
        }
        if (squareError?.category === ErrorCategory.PaymentMethodError) {
            switch (squareError?.code) {
                case ErrorCode.InsufficientFunds:
                case ErrorCode.PaymentLimitExceeded:
                    return { code: PaymentErrorCodes.INSUFFICIENT_FUNDS, message: PaymentErrorMessages.INSUFFICIENT_FUNDS };

                case ErrorCode.InvalidCard:
                case ErrorCode.GenericDecline:
                case ErrorCode.CardDeclined:
                    return { code: PaymentErrorCodes.CARD_DECLINED, message: PaymentErrorMessages.CARD_DECLINED };
                case ErrorCode.ExpirationFailure:
                    return { code: PaymentErrorCodes.EXPIRATION_FAILURE, message: PaymentErrorMessages.EXPIRATION_FAILURE };
                case ErrorCode.CardNotSupported:
                    return { code: PaymentErrorCodes.CARD_NOT_SUPPORTED, message: PaymentErrorMessages.CARD_NOT_SUPPORTED };
                default:
                    return { code: PaymentErrorCodes.UNKNOWN_ERROR, message: PaymentErrorMessages.UNKNOWN_ERROR };
            }
        }
    }
    return { code: "UNKNOWN_ERROR", message: 'unable to process payment' };
}

export function handleStripeError({ error }: { error: InstanceType<typeof Stripe.errors.StripeError> }) {
    const lastError = error.payment_intent?.last_payment_error;
    const declineCode = lastError?.decline_code;
    if (declineCode) {
        return { code: PaymentErrorCodes.CARD_DECLINED, message: PaymentErrorMessages.CARD_DECLINED };
    }
    if (error instanceof Stripe.errors.StripeCardError) {

        switch (error.decline_code) {
            case "insufficient_funds":
                return { code: PaymentErrorCodes.INSUFFICIENT_FUNDS, message: PaymentErrorMessages.INSUFFICIENT_FUNDS };
            case "card_declined":
                return { code: PaymentErrorCodes.CARD_DECLINED, message: PaymentErrorMessages.CARD_DECLINED };
            case "card_expired":
                return { code: PaymentErrorCodes.EXPIRATION_FAILURE, message: PaymentErrorMessages.EXPIRATION_FAILURE };
            case "card_not_supported":
                return { code: PaymentErrorCodes.CARD_NOT_SUPPORTED, message: PaymentErrorMessages.CARD_NOT_SUPPORTED };
            default:
                return { code: PaymentErrorCodes.UNKNOWN_ERROR, message: PaymentErrorMessages.UNKNOWN_ERROR };
        }
    }
    return { code: "UNKNOWN_ERROR", message: 'unable to process payment' };
}