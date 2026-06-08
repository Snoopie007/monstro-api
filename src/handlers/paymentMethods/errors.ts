import { SquareError } from "square";

export function getSquareErrorMessage(err: unknown): string {
    if (err instanceof SquareError && err.errors.length > 0) {
        return err.errors[0]?.detail ?? "Failed to create card";
    }
    return "Failed to create card";
}
