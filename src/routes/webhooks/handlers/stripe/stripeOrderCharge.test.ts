import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";

let existingTransaction: { id: string } | undefined;
const order = {
    id: "order-1",
    member: { id: "member-1" },
    location: { id: "location-1" },
};
const findTransaction = mock(async () => existingTransaction);
const findOrder = mock(async () => order);
const inserts: Array<Record<string, unknown>> = [];
const updates: Array<Record<string, unknown>> = [];
const returningOrder = mock(async () => [order]);
const tx = {
    insert: mock(() => ({
        values: mock((values: Record<string, unknown>) => {
            inserts.push(values);
            return { returning: mock(async () => [{ id: "transaction-1" }]) };
        }),
    })),
    update: mock(() => ({
        set: mock((values: Record<string, unknown>) => {
            updates.push(values);
            return { where: mock(() => ({ returning: returningOrder })) };
        }),
    })),
};
const runTransaction = mock(async (callback: (transaction: typeof tx) => unknown) => callback(tx));
const db = {
    query: {
        transactions: { findFirst: findTransaction },
        orders: { findFirst: findOrder },
    },
    transaction: runTransaction,
};
const queueOrderPaidNotifications = mock(async () => undefined);

let handleStripeOrderCharge: typeof import("./stripeOrderCharge").handleStripeOrderCharge;
beforeAll(async () => {
    mock.module("@/db/db", () => ({ db }));
    mock.module("@/utils/orderEmailNotifications", () => ({ queueOrderPaidNotifications }));
    ({ handleStripeOrderCharge } = await import("./stripeOrderCharge"));
});

const input = {
    orderId: "order-1",
    locationId: "location-1",
    memberId: "member-1",
    paymentType: "card" as const,
    failedReason: null,
    failedCode: null,
    success: true,
    amount: 1200,
    paymentMethodId: "payment-method-1",
    paymentIntentId: "payment-intent-1",
    feeAmount: 0,
    stripeChargeId: "charge-1",
};

describe("handleStripeOrderCharge", () => {
    beforeEach(() => {
        mock.clearAllMocks();
        existingTransaction = undefined;
        inserts.length = 0;
        updates.length = 0;
    });

    test("ignores an already-recorded payment before changing the order", async () => {
        existingTransaction = { id: "existing-transaction" };

        await handleStripeOrderCharge(input);

        expect(findTransaction).toHaveBeenCalledTimes(1);
        expect(findOrder).not.toHaveBeenCalled();
        expect(runTransaction).not.toHaveBeenCalled();
        expect(inserts).toHaveLength(0);
        expect(updates).toHaveLength(0);
        expect(queueOrderPaidNotifications).not.toHaveBeenCalled();
    });

    test("records a payment that has not been handled", async () => {
        await handleStripeOrderCharge(input);

        expect(findTransaction).toHaveBeenCalledTimes(1);
        expect(runTransaction).toHaveBeenCalledTimes(1);
        expect(inserts).toHaveLength(1);
        expect(updates).toHaveLength(1);
        expect(queueOrderPaidNotifications).toHaveBeenCalledTimes(1);
    });
});
