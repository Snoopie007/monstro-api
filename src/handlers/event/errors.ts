import Stripe from "stripe";
import { SquareError } from "square";
import { handleSquareError, handleStripeError } from "@/utils/paymentErrors";
import { EventRegistrationError } from "./shared";

type StatusFn = (code: number, body: Record<string, string> | string) => unknown;

export function mapEventRegistrationError(status: StatusFn, error: unknown) {
    console.error(error);
    if (error instanceof EventRegistrationError) {
        return status(error.status, {
            error: error.message,
            ...(error.code ? { code: error.code } : {}),
        });
    }
    if (error instanceof Stripe.errors.StripeError) {
        const { message } = handleStripeError({ error });
        return status(400, { error: message });
    }
    if (error instanceof SquareError) {
        const { message } = handleSquareError(error);
        return status(400, { error: message });
    }
    return status(500, { error: "Unable to register for event" });
}
