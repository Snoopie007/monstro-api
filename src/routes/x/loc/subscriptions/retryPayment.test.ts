import { beforeEach, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";

const queueAdd = mock(async (
    _name: string,
    _data: unknown,
    _options: { jobId: string },
) => ({ id: "retry-job" }));
let transactionInvoice: { id: string } | null = { id: "invoice-1" };
let selectedInvoiceId: string | null = "invoice-1";
let attemptStatus: string | undefined;

const failedTransaction = {
    id: "transaction-1",
    memberId: "member-1",
    paymentIntentId: "payment-1" as string | null,
    metadata: {
        gatewayService: "stripe",
    },
};

const leftJoin = mock(() => ({
    where: mock(() => ({
        orderBy: mock(() => ({
            limit: mock(async () => selectedInvoiceId ? [{
                ...failedTransaction,
                invoiceId: selectedInvoiceId,
                invoiceMetadata: { billingAttempt: { status: attemptStatus } },
            }] : []),
        })),
    })),
}));

const db = {
    query: {
        transactions: {
            findFirst: mock(async () => ({
                ...failedTransaction,
                type: "inbound",
                status: "failed",
                invoice: transactionInvoice ? {
                    ...transactionInvoice,
                    memberId: "member-1",
                    locationId: "location-1",
                    memberPlanId: "subscription-1",
                    metadata: { billingAttempt: { status: attemptStatus } },
                } : null,
            })),
        },
        memberSubscriptions: {
            findFirst: mock(async () => ({
                id: "subscription-1",
                memberId: "member-1",
                status: "past_due",
                cancelAt: null,
                parentId: null,
            })),
        },
        memberInvoices: {
            findFirst: mock(async () => ({
                id: "invoice-1", metadata: { billingAttempt: { status: attemptStatus } },
            })),
        },
    },
    select: mock(() => ({
        from: mock(() => ({ leftJoin })),
    })),
};

mock.module("@/db/db", () => ({ db }));
mock.module("@/queues/payments", () => ({
    paymentQueue: { add: queueAdd },
}));
mock.module("@/queues/subscriptions", () => ({
    scheduleRenewalRepair: mock(async () => {}),
}));

const { retryTransactionRoutes } = await import("../transactions/retry");
const { retrySubscriptionPaymentRoutes } = await import("./retryPayment");

const transactionApp = await retryTransactionRoutes(
    new Elysia({ prefix: "/x/loc/:lid/transactions" }) as never,
);
const subscriptionApp = await retrySubscriptionPaymentRoutes(
    new Elysia({ prefix: "/x/loc/:lid/subscriptions" }) as never,
);

beforeEach(() => {
    mock.clearAllMocks();
    transactionInvoice = { id: "invoice-1" };
    selectedInvoiceId = "invoice-1";
    failedTransaction.paymentIntentId = "payment-1";
    attemptStatus = undefined;
});

for (const [name, app, path] of [
    ["transaction", transactionApp, "transactions/transaction-1/retry"],
    ["subscription", subscriptionApp, "subscriptions/subscription-1/payment/retry"],
] as const) {
    test(`${name} permits explicit retry after a known failure without an intent`, async () => {
        failedTransaction.paymentIntentId = null;
        attemptStatus = "failed";
        const response = await app.handle(new Request(
            `http://localhost/x/loc/location-1/${path}`, { method: "POST" },
        ));
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ enqueued: true });
    });

    test.each(["in_flight", "unknown", "processing", "requires_action"])(
        `${name} holds %s rather than replacing an unresolved payment`,
        async (state) => {
            failedTransaction.paymentIntentId = null;
            attemptStatus = state;
            const response = await app.handle(new Request(
                `http://localhost/x/loc/location-1/${path}`, { method: "POST" },
            ));
            expect(response.status).toBe(409);
            expect(queueAdd).not.toHaveBeenCalled();
        },
    );

    test(`${name} does not assume a legacy missing-intent failure is safe`, async () => {
        failedTransaction.paymentIntentId = null;
        const response = await app.handle(new Request(
            `http://localhost/x/loc/location-1/${path}`, { method: "POST" },
        ));
        expect(response.status).toBe(400);
        expect(queueAdd).not.toHaveBeenCalled();
    });
}

test("transaction retry rejects a failed payment without an invoice", async () => {
    transactionInvoice = null;

    const response = await transactionApp.handle(new Request(
        "http://localhost/x/loc/location-1/transactions/transaction-1/retry",
        { method: "POST" },
    ));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(expect.objectContaining({ code: "INVOICE_NOT_FOUND" }));
    expect(queueAdd).not.toHaveBeenCalled();
});

test("subscription retry rejects a failed payment without an invoice", async () => {
    selectedInvoiceId = null;

    const response = await subscriptionApp.handle(new Request(
        "http://localhost/x/loc/location-1/subscriptions/subscription-1/payment/retry",
        { method: "POST" },
    ));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(expect.objectContaining({ code: "FAILED_TRANSACTION_NOT_FOUND" }));
    expect(queueAdd).not.toHaveBeenCalled();
});
