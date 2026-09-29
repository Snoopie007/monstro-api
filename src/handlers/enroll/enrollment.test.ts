import { beforeEach, expect, mock, test } from "bun:test";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { memberLocations } from "@/subtrees/schemas";
import type { ChargeWithGatewayResult } from "@/utils/checkoutUtil";

const inserted: Record<string, unknown>[] = [];
const updated: Record<string, unknown>[] = [];
const updateTargets: { table: unknown; condition: SQL }[] = [];

const tx = {
    insert: mock(() => ({
        values: mock((values: Record<string, unknown>) => {
            inserted.push(values);
            const id = inserted.length === 1
                ? "transaction-1"
                : inserted.length === 2
                    ? "package-1"
                    : "invoice-1";
            const returning = mock(async () => [{ ...values, id }]);
            return {
                returning,
                onConflictDoNothing: mock(() => ({ returning })),
            };
        }),
    })),
    update: mock((table: unknown) => ({
        set: mock((values: Record<string, unknown>) => {
            updated.push(values);
            return { where: mock(async (condition: SQL) => { updateTargets.push({ table, condition }); }) };
        }),
    })),
};

const db = {
    insert: tx.insert,
    query: {
        memberPlanPricing: {
            findFirst: mock(async () => ({
                id: "pricing-1",
                name: "Eight classes",
                price: 1000,
                interval: "month",
                intervalThreshold: 1,
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

const chargeWithGateway = mock(async (): Promise<ChargeWithGatewayResult> => ({
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
    recoverEnrollUnsignedDocs: mock(async () => []),
    fetchPromoDiscount: mock(async () => ({ type: "fixed_amount", value: 0 })),
    getAdditionalFeesForCheckout: mock(async () => [{ id: "fee-1" }]),
    getCheckoutContext,
    getMemberCheckoutContext,
    triggerPurchase: mock(async () => undefined),
}));
mock.module("@/libs/broadcast/achievements", () => ({
    broadcastAchievement: mock(() => undefined),
}));
mock.module("@/queues/subscriptions", () => ({
    scheduleCronBasedRenewal: mock(async () => undefined),
    scheduleRecursiveRenewal: mock(async () => undefined),
}));

const { handleEnrollPackage } = await import("./pkg");
const { handleEnrollSubscription } = await import("./sub");

beforeEach(() => {
    inserted.length = 0;
    updated.length = 0;
    updateTargets.length = 0;
    db.transaction.mockClear();
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
    expect(updated).toEqual([
        { redemptionCount: expect.anything() },
        { status: "active", updated: expect.any(Date) },
    ]);
    expectMemberActivated();
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
    expectMemberActivated();
});

function expectMemberActivated() {
    const index = updateTargets.findIndex(({ table }) => table === memberLocations);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(updated[index]).toEqual({ status: "active", updated: expect.any(Date) });
    const query = new PgDialect().sqlToQuery(updateTargets[index]!.condition);
    expect(query.sql).toContain('"member_locations"."member_id" = $1');
    expect(query.sql).toContain('and "member_locations"."location_id" = $2');
    expect(query.params).toEqual(["member-1", "location-1"]);
    expect(db.transaction).toHaveBeenCalledTimes(1);
}

const enrollmentInput = {
    lid: "location-1",
    mid: "member-1",
    priceId: "pricing-1",
    paymentMethodId: "payment-method-1",
    paymentType: "card" as const,
    attemptId: "attempt-1",
};

test("successful subscription checkout activates the member at the matching location", async () => {
    expect(await handleEnrollSubscription(enrollmentInput)).toEqual({ ok: true, unsignedDocs: [] });
    expectMemberActivated();
});

for (const [name, enroll] of [
    ["package", handleEnrollPackage],
    ["subscription", handleEnrollSubscription],
] as const) {
    test(`${name} declined payment does not activate the member`, async () => {
        chargeWithGateway.mockResolvedValueOnce({
            status: "failed",
            failureReason: "Declined",
            failureCode: "DECLINED",
            gatewayMetadata: {},
        });
        await expect(enroll(enrollmentInput)).rejects.toThrow("Declined");
        expect(updateTargets).toHaveLength(0);
        expect(db.transaction).not.toHaveBeenCalled();
    });

    test(`${name} uncertain payment does not activate the member`, async () => {
        chargeWithGateway.mockResolvedValueOnce({ status: "uncertain", message: "Timed out", gatewayMetadata: {} });
        await expect(enroll(enrollmentInput)).rejects.toThrow("Payment status is unknown");
        expect(updateTargets).toHaveLength(0);
        expect(db.transaction).not.toHaveBeenCalled();
    });

    test(`${name} quote does not activate the member`, async () => {
        await enroll({ ...enrollmentInput, quoteOnly: true });
        expect(updateTargets).toHaveLength(0);
        expect(db.transaction).not.toHaveBeenCalled();
        expect(chargeWithGateway).not.toHaveBeenCalled();
    });
}
