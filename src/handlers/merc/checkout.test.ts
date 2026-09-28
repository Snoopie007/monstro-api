import { beforeEach, expect, mock, test } from "bun:test";

const steps: string[] = [];
const stockUpdates: Record<string, unknown>[] = [];
const inserted: Record<string, unknown>[] = [];
const dispatch = mock(async () => []);
const failedRuns: Array<{ transactionId: string }> = [];
let workflowUnavailable = false;
mock.module("@subtrees/utils/server/workflows", () => ({
    dispatchWorkflowTrigger: dispatch,
    dispatchPaymentFailed: async (_tx: unknown, transactionId: string) => {
        if (workflowUnavailable) throw new Error("Workflow unavailable");
        failedRuns.push({ transactionId });
    },
}));

const tx = {
    transaction: mock(async (callback: (value: unknown) => unknown): Promise<unknown> => callback(tx)),
    query: { orders: { findFirst: mock(async () => undefined) } },
    insert: mock(() => ({
        values: mock((values: Record<string, unknown>) => {
            inserted.push(values);
            steps.push("trackingNumber" in values ? "order" : "transaction");
            const returning = mock(async () => [{ id: "trackingNumber" in values ? "order-1" : "transaction-1", ...values }]);
            return { onConflictDoNothing: mock(() => ({ returning })), returning };
        }),
    })),
    update: mock(() => ({
        set: mock((values: Record<string, unknown>) => {
            stockUpdates.push(values);
            steps.push("stock");
            return { where: mock(() => ({ returning: mock(async () => [{ id: "variant-1" }]) })) };
        }),
    })),
};

const db = {
    query: {
        transactions: { findFirst: mock(async () => undefined) },
        orders: { findFirst: mock(async () => undefined) },
        promos: { findFirst: mock(async () => undefined) },
    },
    select: mock(() => ({
        from: mock(() => ({
            innerJoin: mock(() => ({
                where: mock(async () => [{
                    id: "variant-1",
                    name: "Uniform",
                    price: 1200,
                    salePrice: null,
                    stock: 10,
                    active: true,
                    productActive: true,
                }]),
            })),
        })),
    })),
    transaction: mock(async (callback: (value: typeof tx) => unknown) => {
        const savedCount = inserted.length, runCount = failedRuns.length;
        try { return await callback(tx); }
        catch (error) { inserted.length = savedCount; failedRuns.length = runCount; throw error; }
    }),
};

class CheckoutError extends Error {
    constructor(public status: number, message: string) {
        super(message);
    }
}

mock.module("@/db/db", () => ({ db }));
const chargeWithGateway = mock(async () => ({
    status: "approved" as const,
    paymentIntentId: "payment-1",
    paymentType: "card" as const,
    gatewayMetadata: {},
}));
let additionalFeeTotal = 0;
let additionalFeeLines: Array<{
    feeId: string;
    refundable: boolean;
    name: string;
    quantity: number;
    price: number;
    tax: number;
}> = [];
let configuredAdditionalFees: Array<{ id: string; description: string | null }> = [];
mock.module("@/utils", () => ({
    calculateOrderTotals: () => ({
        total: 1200,
        discount: 0,
        platformFeeAmount: 0,
        tax: 0,
        subtotal: 1200,
        additionalFeeTotal,
        additionalFeeLines,
        lineItems: [{ variantId: "variant-1", productName: "Uniform", quantity: 1, unitCost: 1200, tax: 0 }],
    }),
    chargeWithGateway,
    CheckoutError,
    CheckoutPendingError: CheckoutError,
    getAdditionalFeesForCheckout: mock(async () => configuredAdditionalFees),
    getCheckoutContext: mock(async () => ({
        gatewayCustomerId: "customer-1",
        locationState: { planId: 2, currency: "USD" },
        taxRates: [],
        gateway: { service: "stripe", integrationId: "integration-1" },
    })),
    PaymentChargeError: CheckoutError,
}));

const { handleMercCheckout } = await import("./checkout");

beforeEach(() => {
    failedRuns.length = 0;
    workflowUnavailable = false;
    steps.length = 0;
    stockUpdates.length = 0;
    inserted.length = 0;
    additionalFeeTotal = 0;
    additionalFeeLines = [];
    configuredAdditionalFees = [];
    chargeWithGateway.mockClear();
    dispatch.mockReset();
    dispatch.mockResolvedValue([]);
});

test.each([
    { type: "StripeCardError", code: "card_declined", message: "Declined", payment_intent: { id: "pi_decline" } },
    { name: "SquareError", body: { errors: [{ code: "CARD_DECLINED", detail: "Declined" }], payment: { id: "square_decline" } } },
])("a thrown decline saves a failed payment and starts a workflow, without an order", async (error) => {
    chargeWithGateway.mockRejectedValueOnce(error);
    await expect(handleMercCheckout({
        lid: "location-1", mid: "member-1", items: [{ variantId: "variant-1", quantity: 1 }],
        paymentMethodId: "method-1", attemptId: "attempt",
    })).rejects.toThrow();
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({ status: "failed", memberId: "member-1", locationId: "location-1" });
    expect(failedRuns).toEqual([{ transactionId: inserted[0]!.id as string }]);
    expect(stockUpdates).toHaveLength(0);
});

test("a timeout keeps the original error and creates no failed payment or workflow", async () => {
    const timeout = new Error("Timed out");
    chargeWithGateway.mockRejectedValueOnce(timeout);
    await expect(handleMercCheckout({
        lid: "location-1", mid: "member-1", items: [{ variantId: "variant-1", quantity: 1 }],
        paymentMethodId: "method-1", attemptId: "attempt",
    })).rejects.toBe(timeout);
    expect(inserted).toEqual([]);
    expect(failedRuns).toEqual([]);
});

test("held-for-review keeps its existing failed billing record without a workflow", async () => {
    chargeWithGateway.mockResolvedValueOnce({
        status: "failed", failureCode: "4", failureReason: "Held",
        gatewayMetadata: { gatewayService: "authorize", authorizeResponseCode: "4" },
    } as never);
    await expect(handleMercCheckout({
        lid: "location-1", mid: "member-1", items: [{ variantId: "variant-1", quantity: 1 }],
        paymentMethodId: "method-1", attemptId: "attempt",
    })).rejects.toThrow();
    expect(inserted[0]).toMatchObject({ status: "failed" });
    expect(failedRuns).toEqual([]);
});

test("a workflow write failure rolls back the failed-payment insert", async () => {
    workflowUnavailable = true;
    chargeWithGateway.mockRejectedValueOnce({ type: "StripeCardError", code: "card_declined", message: "Declined" });
    await expect(handleMercCheckout({
        lid: "location-1", mid: "member-1", items: [{ variantId: "variant-1", quantity: 1 }],
        paymentMethodId: "method-1", attemptId: "attempt",
    })).rejects.toThrow("Workflow unavailable");
    expect(inserted).toEqual([]);
    expect(failedRuns).toEqual([]);
});

test("returns public additional fee details for checkout quotes", async () => {
    additionalFeeTotal = 125;
    configuredAdditionalFees = [{ id: "fee-internal", description: "Supports facility upkeep." }];
    additionalFeeLines = [{
        feeId: "fee-internal",
        refundable: false,
        name: "Facility fee",
        quantity: 1,
        price: 125,
        tax: 10,
    }];

    const quote = await handleMercCheckout({
        lid: "location-1",
        mid: "member-1",
        items: [{ variantId: "variant-1", quantity: 1 }],
        paymentMethodId: "quote",
        paymentType: "card",
        attemptId: "quote",
        quoteOnly: true,
    });

    expect(quote).toEqual(expect.objectContaining({
        feesAmount: 125,
        additionalFees: [{ label: "Facility fee", amount: 125, description: "Supports facility upkeep." }],
    }));
    expect(quote).not.toHaveProperty("additionalFeeLines");
    expect(chargeWithGateway).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
});

test("decrements inventory in the paid order transaction", async () => {
    const order = await handleMercCheckout({
        lid: "location-1",
        mid: "member-1",
        items: [{ variantId: "variant-1", quantity: 1 }],
        paymentMethodId: "method-1",
        paymentType: "card",
        attemptId: "attempt-1",
    });

    expect(order).toEqual(expect.objectContaining({ id: expect.stringMatching(/^ord_/) }));
    expect(stockUpdates).toHaveLength(1);
    expect(stockUpdates[0]).toEqual(expect.objectContaining({ updated: expect.any(Date) }));
    expect(steps).toEqual(["transaction", "stock", "order"]);
    expect(inserted).toHaveLength(2);
    expect(dispatch).toHaveBeenCalledWith(tx, {
        type: "order::created", locationId: "location-1", memberId: "member-1",
        orderId: (order as { id: string }).id,
    });
});

test("returning an existing transaction's order does not dispatch again", async () => {
    tx.insert.mockReturnValueOnce({
        values: mock(() => ({ onConflictDoNothing: mock(() => ({ returning: mock(async () => []) })) })),
    } as never);
    tx.query.orders.findFirst.mockResolvedValueOnce({ id: "existing", status: "paid" } as never);
    const result = await handleMercCheckout({
        lid: "location-1", mid: "member-1", items: [{ variantId: "variant-1", quantity: 1 }],
        paymentMethodId: "method-1", attemptId: "attempt-1",
    });
    expect(result).toMatchObject({ id: "existing", status: "paid" });
    expect(dispatch).not.toHaveBeenCalled();
    expect(stockUpdates).toHaveLength(0);
});
