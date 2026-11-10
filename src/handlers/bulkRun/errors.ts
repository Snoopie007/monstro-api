type StatusFn = (code: number, body: Record<string, string> | string) => unknown;

/** A request the vendor portal can show to staff as it is. */
export class BulkRunError extends Error {
    readonly status: 400 | 403 | 404 | 409;

    constructor(status: 400 | 403 | 404 | 409, message: string) {
        super(message);
        this.name = "BulkRunError";
        this.status = status;
    }
}

/** Sends a BulkRunError with its own status and message. Anything else is logged and sent as 500. */
export function mapBulkRunError(status: StatusFn, error: unknown, fallback: string) {
    if (error instanceof BulkRunError) {
        return status(error.status, { error: error.message });
    }
    console.error(fallback, error);
    return status(500, { error: fallback });
}
