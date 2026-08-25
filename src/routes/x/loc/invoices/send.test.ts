import { beforeEach, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";

let gatewayService: "stripe" | "square" = "stripe";
const calculateChargeDetails = mock(() => ({ feesAmount: 999 }));
const stripeCreateCharge = mock(async () => ({ id: "stripe-payment-1" }));
const squareCreateCharge = mock(async () => ({
    id: "square-payment-1",
    status: "COMPLETED",
    receiptUrl: "https://example.com/receipt",
}));
const retrievePaymentMethod = mock(async () => ({ id: "payment-method-1", type: "card" }));
const insertedValues: Record<string, unknown>[] = [];

const db = {
    query: {
        memberInvoices: {
            findFirst: mock(async () => ({
                id: "invoice-1",
                memberId: "member-1",
                memberPlanId: "subscription-1",
                locationId: "location-1",
                transactionId: null,
                description: "Monthly membership",
                items: [],
                total: 10_000,
                subTotal: 9_000,
                tax: 1_000,
                currency: "USD",
                status: "draft",
                paymentType: "card",
                dueDate: new Date("2030-01-01T00:00:00.000Z"),
                metadata: {
                    collectionMethod: "charge_automatically",
                    gatewayService,
                    paymentMethodId: "payment-method-1",
                    platformFeeAmount: 200,
                },
                member: {
                    id: "member-1",
                    firstName: "Test",
                    lastName: "Member",
                    email: "member@example.com",
                },
                location: {
                    name: "Test Location",
                    email: "location@example.com",
                    phone: null,
                    locationState: {
                        planId: 999,
                        paymentGatewayId: "integration-1",
                    },
                    integrations: [{
                        id: "integration-1",
                        accountId: "account-1",
                        service: gatewayService,
                        accessToken: "access-token",
                        metadata: { squareLocationId: "square-location-1" },
                    }],
                },
            })),
        },
        transactions: { findFirst: mock(async () => undefined) },
        memberLocations: {
            findFirst: mock(async () => ({
                gatewayCustomerId: gatewayService === "stripe"
                    ? "cus_customer-1"
                    : "square-customer-1",
            })),
        },
    },
    update: mock(() => ({
        set: mock(() => ({ where: mock(async () => undefined) })),
    })),
    insert: mock(() => ({
        values: mock((values: Record<string, unknown>) => {
            insertedValues.push(values);
            return { returning: mock(async () => [{ id: "transaction-1" }]) };
        }),
    })),
};

mock.module("@/db/db", () => ({ db }));
mock.module("@/utils/enrollUtils", () => ({ calculateChargeDetails }));
mock.module("./shared", () => ({
    scheduleInvoiceReminderAndOverdue: mock(async () => undefined),
}));
mock.module("@/libs/PaymentGateway", () => ({
    StripePaymentGateway: class {
        createCharge = stripeCreateCharge;
        retrievePaymentMethod = retrievePaymentMethod;
    },
    SquarePaymentGateway: class {
        createCharge = squareCreateCharge;
    },
}));

const { sendInvoiceRoutes } = await import("./send");
const app = await sendInvoiceRoutes(new Elysia({ prefix: "/:lid" }) as never);

beforeEach(() => {
    gatewayService = "stripe";
    insertedValues.length = 0;
    mock.clearAllMocks();
});

test("uses the invoice platform-fee snapshot for Stripe", async () => {
    const response = await app.handle(new Request(
        "http://localhost/location-1/invoice-1/send",
        {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ paymentMethodId: "payment-method-1" }),
        },
    ));

    expect(response.status).toBe(200);
    expect(stripeCreateCharge).toHaveBeenCalledWith(
        "cus_customer-1",
        "payment-method-1",
        expect.objectContaining({ feesAmount: 200 }),
    );
    expect(calculateChargeDetails).not.toHaveBeenCalled();
});

test("uses the invoice platform-fee snapshot for Square", async () => {
    gatewayService = "square";

    const response = await app.handle(new Request(
        "http://localhost/location-1/invoice-1/send",
        {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ paymentMethodId: "payment-method-1" }),
        },
    ));

    expect(response.status).toBe(200);
    expect(squareCreateCharge).toHaveBeenCalledWith(
        "square-customer-1",
        "payment-method-1",
        expect.objectContaining({ feesAmount: 200 }),
    );
    expect(insertedValues[0]).toEqual(expect.objectContaining({ feeAmount: 200 }));
    expect(calculateChargeDetails).not.toHaveBeenCalled();
});
