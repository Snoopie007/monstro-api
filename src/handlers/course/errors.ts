import Stripe from "stripe";
import { SquareError } from "square";
import { CheckoutError } from "@/utils";
import { handleSquareError, handleStripeError } from "@/utils/paymentErrors";

type StatusFn = (code: number, body: Record<string, string> | string) => unknown;

export class CourseEnrollError extends Error {
    readonly status: 400 | 404 | 409 | 500;
    readonly code?: string;

    constructor(status: 400 | 404 | 409 | 500, message: string, code?: string) {
        super(message);
        this.name = "CourseEnrollPaidError";
        this.status = status;
        this.code = code;
    }
}

export function mapCourseEnrollPaidError(status: StatusFn, error: unknown) {
    console.error(error);
    if (error instanceof CourseEnrollError) {
        return status(error.status, {
            error: error.message,
            ...(error.code ? { code: error.code } : {}),
        });
    }
    if (error instanceof CheckoutError) {
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
    return status(500, { error: "Unable to enroll in course" });
}
