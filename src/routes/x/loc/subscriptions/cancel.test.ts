import { beforeEach, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";

const refundPayment = mock(async () => ({ id: "refund-1", status: "COMPLETED" }));
const leftJoin = mock(() => ({
    where: mock(() => ({
        orderBy: mock(() => ({
            limit: mock(async () => [{
                id: "transaction-1",
                total: 1200,
                items: [{
                    feeId: "fee-1",
                    refundable: false,
                    name: "Signup fee",
                    quantity: 1,
                    price: 200,
                }],
                currency: "USD",
                paymentIntentId: "square-payment-1",
                metadata: {
                    gatewayService: "square",
                    squarePaymentId: "square-payment-1",
                },
            }]),
        })),
    })),
}));
const updates: Record<string, unknown>[] = [];
const db = {
    query: {
        memberSubscriptions: {
            findFirst: mock(async () => ({
                id: "subscription-1",
                memberId: "member-1",
                currentPeriodEnd: new Date("2030-02-01T00:00:00.000Z"),
                metadata: {},
            })),
        },
        locationState: { findFirst: mock(async () => ({ paymentGatewayId: "integration-1" })) },
        integrations: {
            findFirst: mock(async () => ({
                service: "square",
                accessToken: "square-token",
                accountId: "square-account",
            })),
        },
    },
    select: mock(() => ({
        from: mock(() => ({ leftJoin })),
    })),
    update: mock(() => ({
        set: mock((values: Record<string, unknown>) => {
            updates.push(values);
            return { where: mock(async () => undefined) };
        }),
    })),
};

mock.module("@/db/db", () => ({ db }));
mock.module("@/libs/PaymentGateway", () => ({
    SquarePaymentGateway: class {
        refundPayment = refundPayment;
    },
    StripePaymentGateway: class {},
}));
mock.module("@/queues/subscriptions", () => ({
    removeRenewalJobs: mock(async () => undefined),
}));

const { cancelSubscriptionRoutes } = await import("./cancel");
const app = await cancelSubscriptionRoutes(new Elysia({ prefix: "/:lid" }) as never);

beforeEach(() => {
    mock.clearAllMocks();
    updates.length = 0;
});

test("finds a refundable subscription charge through its invoice instead of transaction metadata", async () => {
    const response = await app.handle(new Request(
        "http://localhost/location-1/subscription-1/cancel",
        {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                mode: "now",
                refund: { enabled: true, amountType: "full" },
            }),
        },
    ));

    expect(response.status).toBe(200);
    expect(leftJoin).toHaveBeenCalledTimes(1);
    expect(refundPayment).toHaveBeenCalledWith(
        "square-payment-1",
        1000,
        "Subscription cancellation",
    );
    expect(await response.json()).toEqual(expect.objectContaining({
        status: "canceled",
        refund: expect.objectContaining({
            executed: true,
            amount: 1000,
            nonRefundableAmount: 200,
        }),
    }));
    expect(updates[0]).toEqual(expect.objectContaining({
        refunded: true,
        refundedAmount: 1000,
    }));
});
