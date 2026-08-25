import { beforeEach, expect, mock, test } from "bun:test";

const inserted: Record<string, unknown>[] = [];
const updated: Record<string, unknown>[] = [];

const tx = {
    insert: mock(() => ({
        values: mock((values: Record<string, unknown>) => {
            inserted.push(values);
            const id = inserted.length === 1
                ? "transaction-1"
                : inserted.length === 2
                    ? "package-1"
                    : "invoice-1";
            const returning = mock(async () => [{ id }]);
            return {
                returning,
                onConflictDoNothing: mock(() => ({ returning })),
            };
        }),
    })),
    update: mock(() => ({
        set: mock((values: Record<string, unknown>) => {
            updated.push(values);
            return { where: mock(async () => undefined) };
        }),
    })),
};

const db = {
    query: {
        memberPlanPricing: {
            findFirst: mock(async () => ({
                id: "pricing-1",
                name: "Eight classes",
                price: 1000,
                expireThreshold: null,
                expireInterval: null,
                plan: {
                    id: "plan-1",
                    name: "Starter package",
                    type: "one-time",
                    locationId: "location-1",
                    archived: false,
                    contractId: null,
                    groupId: null,
                    totalClassLimit: 8,
                },
            })),
        },
        contractTemplates: { findFirst: mock(async () => undefined) },
        memberContracts: { findFirst: mock(async () => undefined) },
    },
    transaction: mock(async (callback: (value: typeof tx) => unknown) => callback(tx)),
};

class CheckoutError extends Error {
    constructor(public status: number, message: string) {
        super(message);
    }
}

const chargeWithGateway = mock(async () => ({
    status: "approved" as const,
    paymentIntentId: "payment-1",
    paymentType: "card" as const,
    gatewayMetadata: { gatewayService: "stripe" },
}));
const getCheckoutContext = mock(async () => ({
    ml: {
        signedWaiverId: null,
        member: { userId: "user-1" },
        location: {
            locationState: { planId: 1, currency: "USD", waiverId: null },
        },
    },
    locationState: { planId: 1, currency: "USD", waiverId: null },
    taxRates: [{ percentage: 10, isDefault: true }],
    gatewayCustomerId: "customer-1",
    gateway: {
        service: "stripe" as const,
        integrationId: "integration-1",
        accessToken: "stripe-token",
        accountId: "stripe-account",
        metadata: {},
    },
}));
const getMemberCheckoutContext = mock(async () => ({
    ml: {
        signedWaiverId: null,
        member: { userId: "user-1" },
        location: {
            locationState: { planId: 1, currency: "USD", waiverId: null },
        },
    },
    locationState: { planId: 1, currency: "USD", waiverId: null },
    taxRates: [{ percentage: 10, isDefault: true }],
}));
const additionalFeeLine = {
    feeId: "fee-1",
    refundable: false,
    name: "Facility fee",
    quantity: 1,
    price: 200,
    tax: 20,
};

mock.module("@/db/db", () => ({ db }));
mock.module("@/utils", () => ({
    addMembertoGroup: mock(async () => undefined),
    calculateChargeDetails: mock(() => ({
        total: 1320,
        subTotal: 1000,
        unitCost: 1000,
        tax: 120,
        discount: 0,
        productDiscount: 0,
        feesAmount: 20,
        additionalFeeTotal: 200,
        additionalFeeLines: [additionalFeeLine],
    })),
    calculateThresholdDate: mock(() => new Date("2030-02-01T00:00:00.000Z")),
    chargeWithGateway,
    CheckoutError,
    createEnrollUnsignedDocs: mock(async () => []),
    fetchPromoDiscount: mock(async () => ({ type: "fixed_amount", value: 0 })),
    getAdditionalFeesForCheckout: mock(async () => [{ id: "fee-1" }]),
    getCheckoutContext,
    getMemberCheckoutContext,
    triggerPurchase: mock(async () => undefined),
}));
mock.module("@/libs/broadcast/achievements", () => ({
    broadcastAchievement: mock(() => undefined),
}));

const { handleEnrollPackage } = await import("./pkg");

beforeEach(() => {
    inserted.length = 0;
    updated.length = 0;
    chargeWithGateway.mockClear();
    getCheckoutContext.mockClear();
    getMemberCheckoutContext.mockClear();
});

test("cash package checkout persists the same fee snapshot without calling a gateway", async () => {
    const result = await handleEnrollPackage({
        lid: "location-1",
        mid: "member-1",
        priceId: "pricing-1",
        paymentType: "cash",
        promoId: "promo-1",
        attemptId: "attempt-1",
        startDate: "2030-01-01T00:00:00.000Z",
    });

    expect(result).toEqual({ ok: true, unsignedDocs: [] });
    expect(chargeWithGateway).not.toHaveBeenCalled();
    expect(getCheckoutContext).not.toHaveBeenCalled();
    expect(getMemberCheckoutContext).toHaveBeenCalledTimes(1);
    expect(inserted).toHaveLength(3);
    expect(inserted[0]).toEqual(expect.objectContaining({
        paymentType: "cash",
        total: 1320,
        feeAmount: 20,
        items: expect.arrayContaining([additionalFeeLine]),
        paymentIntentId: null,
    }));
    expect(inserted[1]).toEqual(expect.objectContaining({
        paymentType: "cash",
        promoId: "promo-1",
        status: "active",
    }));
    expect(inserted[2]).toEqual(expect.objectContaining({
        total: 1320,
        feesAmount: 20,
        items: expect.arrayContaining([additionalFeeLine]),
        paid: true,
    }));
    expect(updated).toEqual([{ redemptionCount: expect.anything() }]);
});

test("paid package checkout still charges through the configured gateway", async () => {
    const result = await handleEnrollPackage({
        lid: "location-1",
        mid: "member-1",
        priceId: "pricing-1",
        paymentMethodId: "payment-method-1",
        paymentType: "card",
        attemptId: "attempt-1",
    });

    expect(result).toEqual({ ok: true, unsignedDocs: [] });
    expect(getMemberCheckoutContext).not.toHaveBeenCalled();
    expect(getCheckoutContext).toHaveBeenCalledTimes(1);
    expect(chargeWithGateway).toHaveBeenCalledWith(expect.objectContaining({
        gatewayCustomerId: "customer-1",
        paymentMethodId: "payment-method-1",
        paymentType: "card",
        total: 1320,
        feesAmount: 20,
    }));
    expect(inserted[0]).toEqual(expect.objectContaining({
        paymentMethodId: "payment-method-1",
        paymentIntentId: "payment-1",
        paymentType: "card",
    }));
});
