import { expect, mock, test } from "bun:test";
import { Elysia } from "elysia";
import Stripe from "stripe";

const createCharge = mock(async () => ({ id: "unexpected-payment-intent" }));
const stripeFailure = new Stripe.errors.StripeInvalidRequestError({
    type: "invalid_request_error",
    message: "Line item total does not match amount",
    code: "amount_mismatch",
    param: "amount_details[line_items]",
    requestId: "req_activation",
    statusCode: 400,
} as never);
const createChargeWithoutLineItems = mock(async () => {
    throw stripeFailure;
});

const subscription = {
    id: "subscription-1",
    locationId: "location-1",
    parentId: null,
    memberPlanPricingId: "pricing-1",
    isParticipant: false,
    promoId: null,
    status: "incomplete",
    paymentType: "card",
    trialEnd: null,
    startDate: new Date("2026-08-31T00:00:00.000Z"),
    currentPeriodStart: new Date("2026-08-31T00:00:00.000Z"),
    currentPeriodEnd: new Date("2026-09-30T00:00:00.000Z"),
    metadata: {},
    member: {
        id: "member-1",
        firstName: "Test",
        lastName: "Member",
        email: "member@example.com",
    },
    pricing: {
        id: "pricing-1",
        name: "Standard",
        price: 20_000,
        downpayment: null,
        interval: "month",
        intervalThreshold: 1,
        plan: { name: "Membership", locationId: "location-1" },
    },
    location: {
        name: "Test Location",
        email: "location@example.com",
        phone: null,
        address: null,
        country: "US",
        taxRates: [],
        locationState: {
            planId: 3,
            paymentGatewayId: "integration-1",
        },
        integrations: [{
            id: "integration-1",
            accountId: "acct_1",
            service: "stripe",
            accessToken: "access-token",
            metadata: {},
        }],
    },
};

const db = {
    query: {
        memberSubscriptions: { findFirst: mock(async () => subscription) },
        memberLocations: {
            findFirst: mock(async () => ({ gatewayCustomerId: "cus_1" })),
        },
        locationState: {
            findFirst: mock(async () => ({ paymentGatewayId: "integration-1" })),
        },
        integrations: {
            findFirst: mock(async () => ({
                id: "integration-1",
                locationId: "location-1",
                accountId: "acct_1",
                service: "stripe",
                accessToken: "access-token",
                metadata: {},
            })),
        },
    },
    insert: mock(() => ({
        values: mock(() => ({
            returning: mock(async () => [{ id: "invoice-1" }]),
        })),
    })),
};

mock.module("@/db/db", () => ({ db }));
mock.module("@/utils", () => ({
    calculateChargeDetails: mock(() => ({
        total: 20_600,
        subTotal: 20_000,
        unitCost: 20_000,
        tax: 0,
        discount: 0,
        productDiscount: 0,
        feesAmount: 0,
        additionalFeeTotal: 600,
        additionalFeeLines: [{
            feeId: "fee_1",
            refundable: true,
            name: "Processing fee",
            quantity: 1,
            price: 600,
        }],
    })),
    getAdditionalFeesForCheckout: mock(async () => []),
    getCurrency: mock(() => "usd"),
}));
mock.module("@/libs/PaymentGateway", () => ({
    StripePaymentGateway: class {
        createCharge = createCharge;
        createChargeWithoutLineItems = createChargeWithoutLineItems;
        retrievePaymentMethod = mock(async (_customerId: string, id: string) => ({ id, type: "card" }));
        getCustomer = mock(async () => null);
    },
    SquarePaymentGateway: class {},
}));
mock.module("@/queues/subscriptions", () => ({
    removeRenewalJobs: mock(async () => undefined),
    scheduleCronBasedRenewal: mock(async () => undefined),
    scheduleRecursiveRenewal: mock(async () => undefined),
}));
mock.module("./shared", () => ({
    getNextBillingDate: mock(() => new Date("2026-09-30T00:00:00.000Z")),
    withTimeout: mock(async <T>(promise: Promise<T>) => await promise),
    RETRYABLE_SUBSCRIPTION_STATUSES: new Set(["past_due", "unpaid"]),
    getString: (value: unknown) => typeof value === "string" && value.length > 0 ? value : null,
    resolveGatewayService: (metadata: Record<string, unknown>) =>
        metadata.gatewayService === "square" || typeof metadata.squarePaymentId === "string" ? "square" : "stripe",
    resolveGatewayPaymentId: (transaction: { paymentIntentId: string | null; metadata: Record<string, unknown> }) =>
        transaction.paymentIntentId
            || (typeof transaction.metadata.paymentIntentId === "string" ? transaction.metadata.paymentIntentId : null)
            || (typeof transaction.metadata.squarePaymentId === "string" ? transaction.metadata.squarePaymentId : null)
            || (typeof transaction.metadata.chargeId === "string" ? transaction.metadata.chargeId : null),
}));

// Import after module mocks so the route receives the test doubles.
const { activateSubscriptionRoutes } = await import("./activate");
const app = await activateSubscriptionRoutes(new Elysia({ prefix: "/:lid/subscriptions" }) as never);

test("uses the line-item-free Stripe charge and returns safe Stripe diagnostics", async () => {
    const response = await app.handle(new Request(
        "http://localhost/location-1/subscriptions/subscription-1/activate",
        {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                paymentMethodId: "pm_1",
                paymentType: "card",
            }),
        },
    ));

    expect(response.status).toBe(502);
    expect(createCharge).not.toHaveBeenCalled();
    expect(createChargeWithoutLineItems).toHaveBeenCalledWith(
        "cus_1",
        "pm_1",
        expect.objectContaining({
            total: 20_600,
            feesAmount: 0,
            description: "Payment for Membership/Standard",
            metadata: expect.objectContaining({
                invoiceId: "invoice-1",
                memberSubscriptionId: "subscription-1",
            }),
        }),
    );
    expect(await response.json()).toEqual({
        error: "Line item total does not match amount",
        code: "amount_mismatch",
        details: {
            type: "StripeInvalidRequestError",
            param: "amount_details[line_items]",
            requestId: "req_activation",
            statusCode: 400,
        },
    });
});
