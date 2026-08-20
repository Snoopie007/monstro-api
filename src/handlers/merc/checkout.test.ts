import { beforeEach, expect, mock, test } from "bun:test";

const steps: string[] = [];
const stockUpdates: Record<string, unknown>[] = [];
const inserted: Record<string, unknown>[] = [];

const tx = {
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
    transaction: mock(async (callback: (value: typeof tx) => unknown) => callback(tx)),
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
mock.module("@/utils", () => ({
    authorizeReferenceIdForTransaction: () => "reference-1",
    calculateOrderTotals: () => ({
        total: 1200,
        discount: 0,
        feesAmount: 0,
        tax: 0,
        subtotal: 1200,
        processingFee: 0,
        additionalFeeTotal: 0,
        additionalFeeLines: [],
        lineItems: [{ variantId: "variant-1", productName: "Uniform", quantity: 1, unitCost: 1200, tax: 0 }],
    }),
    chargeWithGateway,
    CheckoutError,
    CheckoutPendingError: CheckoutError,
    getAdditionalFeesForCheckout: mock(async () => []),
    getCheckoutContext: mock(async () => ({
        gatewayCustomerId: "customer-1",
        locationState: { usagePercent: 0, currency: "USD" },
        taxRates: [],
        gateway: { service: "stripe", integrationId: "integration-1" },
    })),
    PaymentChargeError: CheckoutError,
    stableCheckoutTransactionId: () => "transaction-1",
}));

const { handleMercCheckout } = await import("./checkout");

beforeEach(() => {
    steps.length = 0;
    stockUpdates.length = 0;
    inserted.length = 0;
    chargeWithGateway.mockClear();
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

    expect(order).toEqual(expect.objectContaining({ id: "ord_transaction1" }));
    expect(stockUpdates).toHaveLength(1);
    expect(stockUpdates[0]).toEqual(expect.objectContaining({ updated: expect.any(Date) }));
    expect(steps).toEqual(["transaction", "stock", "order"]);
    expect(inserted).toHaveLength(2);
});
