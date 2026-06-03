import Stripe from "stripe";
import { SquareError } from "square";
import { EnrollContextError, handleSquareError, handleStripeError } from "@/utils";

type StatusFn = (code: number, body: { error: string }) => unknown;

export function mapEnrollSubError(status: StatusFn, error: unknown) {
    console.error(error);
    if (error instanceof EnrollContextError) {
        return status(error.status, { error: error.message });
    }
    if (error instanceof Stripe.errors.StripeError) {
        switch (error.type) {
            case "StripeCardError":
                return status(400, { error: error.message });
            default:
                return status(500, { error: error.message });
        }
    }
    if (error instanceof SquareError) {
        const { message } = handleSquareError(error);
        return status(400, { error: message });
    }
    return status(500, { error: "Failed to purchase subscription" });
}

export function mapEnrollPkgError(status: StatusFn, error: unknown) {
    console.error(error);
    if (error instanceof EnrollContextError) {
        return status(error.status, { error: error.message });
    }
    if (error instanceof SquareError) {
        const { message } = handleSquareError(error);
        return status(400, { error: message });
    }
    if (error instanceof Stripe.errors.StripeError) {
        handleStripeError({ error });
        return status(500, { error: error.message });
    }
    return status(500, { error: "Failed to checkout" });
}
