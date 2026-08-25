import { beforeEach, expect, mock, test } from "bun:test";
import { RetrySubPaymentSchema } from "@subtrees/bullmq";
import { Elysia } from "elysia";

const queueAdd = mock(async (
    _name: string,
    _data: unknown,
    _options: { jobId: string },
) => ({ id: "retry-job" }));
let transactionInvoice: { id: string } | null = { id: "invoice-1" };
let selectedInvoiceId: string | null = "invoice-1";

const failedTransaction = {
    id: "transaction-1",
    paymentIntentId: "payment-1",
    metadata: {
        gatewayService: "stripe",
        subscriptionId: "subscription-1",
    },
};

const leftJoin = mock(() => ({
    where: mock(() => ({
        orderBy: mock(() => ({
            limit: mock(async () => [{ ...failedTransaction, invoiceId: selectedInvoiceId }]),
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
                invoice: transactionInvoice,
            })),
        },
        memberSubscriptions: {
            findFirst: mock(async () => ({
                id: "subscription-1",
                status: "past_due",
                cancelAt: null,
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
});

test("transaction retry queues the linked invoice using the worker contract", async () => {
    const response = await transactionApp.handle(new Request(
        "http://localhost/x/loc/location-1/transactions/transaction-1/retry",
        { method: "POST" },
    ));

    expect(response.status).toBe(200);
    const data = queueAdd.mock.calls[0]?.[1];
    expect(RetrySubPaymentSchema.safeParse(data).success).toBe(true);
    expect(data).toEqual({
        invoiceId: "invoice-1",
        attempts: 0,
        subId: "subscription-1",
        lid: "location-1",
    });
});

test("subscription retry queues the linked invoice using the worker contract", async () => {
    const response = await subscriptionApp.handle(new Request(
        "http://localhost/x/loc/location-1/subscriptions/subscription-1/payment/retry",
        { method: "POST" },
    ));

    expect(response.status).toBe(200);
    const data = queueAdd.mock.calls[0]?.[1];
    expect(RetrySubPaymentSchema.safeParse(data).success).toBe(true);
    expect(data).toEqual({
        invoiceId: "invoice-1",
        attempts: 0,
        subId: "subscription-1",
        lid: "location-1",
    });
});

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
    expect(await response.json()).toEqual(expect.objectContaining({ code: "INVOICE_NOT_FOUND" }));
    expect(queueAdd).not.toHaveBeenCalled();
});
