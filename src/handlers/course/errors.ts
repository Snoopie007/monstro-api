import Stripe from "stripe";
import { SquareError } from "square";
import { MercCheckoutError, handleSquareError, handleStripeError } from "@/utils";

type StatusFn = (code: number, body: { error: string } | string) => unknown;

export function mapCourseCheckoutError(status: StatusFn, error: unknown) {
    console.error(error);
    if (error instanceof MercCheckoutError) {
        return status(error.status, { error: error.message });
    }
    if (error instanceof Stripe.errors.StripeError) {
        const { message } = handleStripeError({ error });
        return status(400, { error: message });
    }
    if (error instanceof SquareError) {
        const { message } = handleSquareError(error);
        return status(400, { error: message });
    }
    if (error instanceof Error) {
        if (error.message === "No items provided" || error.message === "Invalid items") {
            return status(400, { error: error.message });
        }
    }
    return status(500, { error: "Failed to checkout" });
}
