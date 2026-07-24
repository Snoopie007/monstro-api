import { createHmac } from "node:crypto";
import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";

const originalFetch = globalThis.fetch;
const signatureKey = "11".repeat(64);
const transaction = {
    id: "00000000-0000-4000-8000-000000000001",
    locationId: "location-1",
    memberId: "member-1",
    total: 100,
    subTotal: 100,
    tax: 0,
    currency: "USD",
    paymentType: "card",
    paymentMethodId: "payment-profile-1",
    status: "pending",
    metadata: {
        gatewayService: "authorize",
        authorizeIntegrationId: "integration-1",
    } as Record<string, unknown>,
};
let providerDetails: Record<string, unknown>;
const updates: Array<Record<string, unknown>> = [];
const inserts: Array<Record<string, unknown>> = [];
let existingInvoice: { id: string } | undefined = { id: "invoice-1" };
let existingEventRegistration: { id: string; status: "pending" | "registered" } | undefined;
const pricing = {
    id: "pricing-1",
    name: "Monthly",
    price: 100,
    interval: "month",
    intervalThreshold: 1,
    plan: { totalClassLimit: 3, contractId: null },
};
const memberLocation = {
    signedWaiverId: null,
    member: { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" },
    location: {
        name: "Dojo",
        phone: "555-0100",
        email: "dojo@example.com",
        taxRates: [],
        locationState: { waiverId: null },
    },
};
const update = mock(() => ({
    set: mock((values: Record<string, unknown>) => {
        updates.push(values);
        return {
            where: mock(() => ({
                returning: mock(async () => [{ id: "updated", ticketId: "ticket-1" }]),
            })),
        };
    }),
}));
const tx = {
    query: {
        transactions: { findFirst: mock(async () => transaction) },
        memberInvoices: { findFirst: mock(async () => existingInvoice) },
        memberPlanPricing: { findFirst: mock(async () => pricing) },
        memberLocations: { findFirst: mock(async () => memberLocation) },
        eventRegistrations: { findFirst: mock(async () => existingEventRegistration) },
        locationEvents: { findFirst: mock(async () => undefined) },
        eventTickets: { findFirst: mock(async () => undefined) },
    },
    insert: mock(() => ({
        values: mock((values: Record<string, unknown>) => {
            inserts.push(values);
            return {
                returning: mock(async () => [{ id: "artifact-1", ...values }]),
            };
        }),
    })),
    update,
    execute: mock(async () => undefined),
};
const findTransaction = mock(async (): Promise<typeof transaction | undefined> => transaction);
const db = {
    query: {
        transactions: { findFirst: findTransaction },
        integrations: {
            findFirst: mock(async () => ({
                id: "integration-1",
                locationId: "location-1",
                accountId: "merchant-1",
                apiKey: "login",
                secretKey: "secret",
                webhookSignatureKey: signatureKey,
            })),
        },
    },
    transaction: mock(async (callback: (transaction: typeof tx) => unknown) => callback(tx)),
};

mock.module("@/db/db", () => ({ db }));
mock.module("@/utils", () => ({ createEnrollUnsignedDocs: mock(async () => []) }));
mock.module("@/queues/subscriptions", () => ({
    scheduleCronBasedRenewal: mock(async () => undefined),
    scheduleRecursiveRenewal: mock(async () => undefined),
}));
const { authorizeWebhookRoutes, verifyAuthorizeWebhookSignature } = await import("./authorize");

const event = {
    notificationId: "notification-1",
    eventType: "net.authorize.payment.authcapture.created",
    payload: {
        id: "authorize-transaction-1",
        entityName: "transaction",
        merchantAccountId: "merchant-1",
    },
};

function request(payload: unknown = event, validSignature = true) {
    const body = JSON.stringify(payload);
    const signature = createHmac("sha512", Buffer.from(signatureKey, "hex")).update(body).digest("hex");
    return new Request("http://localhost/authorize", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-anet-signature": `sha512=${validSignature ? signature : "00".repeat(64)}`,
        },
        body,
    });
}

describe("Authorize.net webhook", () => {
    beforeEach(() => {
        mock.clearAllMocks();
        updates.length = 0;
        inserts.length = 0;
        existingInvoice = { id: "invoice-1" };
        existingEventRegistration = undefined;
        transaction.status = "pending";
        transaction.metadata = {
            gatewayService: "authorize",
            authorizeIntegrationId: "integration-1",
        };
        providerDetails = {
            transId: "authorize-transaction-1",
            transactionType: "authCaptureTransaction",
            transactionStatus: "capturedPendingSettlement",
            responseCode: 1,
            authAmount: 1,
            currencyCode: "USD",
        };
        process.env.AUTHORIZE_API_URL = "https://authorize.test/request";
        globalThis.fetch = Object.assign(async () => new Response(JSON.stringify({
            transaction: providerDetails,
            messages: { resultCode: "Ok" },
        })), { preconnect: originalFetch.preconnect });
    });

    afterAll(() => {
        globalThis.fetch = originalFetch;
    });
    test("verifies the raw request HMAC", () => {
        const body = JSON.stringify(event);
        const signature = createHmac("sha512", Buffer.from(signatureKey, "hex")).update(body).digest("hex");
        expect(verifyAuthorizeWebhookSignature(body, `sha512=${signature}`, signatureKey)).toBe(true);
        expect(verifyAuthorizeWebhookSignature(`${body} `, `sha512=${signature}`, signatureKey)).toBe(false);
    });

    test("rejects malformed payloads", async () => {
        const response = await authorizeWebhookRoutes(new Elysia()).handle(new Request("http://localhost/authorize", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "{",
        }));
        expect(response.status).toBe(400);
    });

    test("rejects an invalid signature", async () => {
        const response = await authorizeWebhookRoutes(new Elysia()).handle(request(event, false));
        expect(response.status).toBe(401);
        expect(updates).toHaveLength(0);
    });

    test("marks the local transaction and invoice paid from provider details", async () => {
        const response = await authorizeWebhookRoutes(new Elysia()).handle(request());
        expect(response.status).toBe(200);
        expect(updates[0]).toEqual(expect.objectContaining({
            status: "paid",
            paymentIntentId: "authorize-transaction-1",
        }));
        expect(updates[1]).toEqual(expect.objectContaining({
            status: "paid",
            paid: true,
            paymentType: "card",
        }));
    });

    test("leaves a provider-declined invoice unpaid", async () => {
        providerDetails = {
            ...providerDetails,
            transactionStatus: "declined",
            responseCode: 2,
            responseReasonCode: 2,
            responseReasonDescription: "Declined",
        };
        const response = await authorizeWebhookRoutes(new Elysia()).handle(request());
        expect(response.status).toBe(200);
        expect(updates[0]).toEqual(expect.objectContaining({ status: "failed", failedCode: "2" }));
        expect(updates[1]).toEqual(expect.objectContaining({ status: "unpaid", paid: false }));
    });

    test("cancels an order when a held payment is later declined", async () => {
        transaction.metadata.checkoutKind = "order";
        providerDetails = {
            ...providerDetails,
            transactionStatus: "declined",
            responseCode: 2,
            responseReasonDescription: "Declined",
        };

        const response = await authorizeWebhookRoutes(new Elysia()).handle(request());

        expect(response.status).toBe(200);
        expect(updates[2]).toEqual(expect.objectContaining({ status: "cancelled" }));
    });

    test("updates a renewal subscription after provider review", async () => {
        transaction.metadata.memberSubscriptionId = "subscription-1";

        const approved = await authorizeWebhookRoutes(new Elysia()).handle(request());

        expect(approved.status).toBe(200);
        expect(updates[2]).toEqual(expect.objectContaining({ status: "active" }));
        expect(updates[3]).toEqual(expect.objectContaining({ status: "active" }));

        updates.length = 0;
        providerDetails = {
            ...providerDetails,
            transactionStatus: "declined",
            responseCode: 2,
            responseReasonDescription: "Declined",
        };
        const declined = await authorizeWebhookRoutes(new Elysia()).handle(request());

        expect(declined.status).toBe(200);
        expect(updates[2]).toEqual(expect.objectContaining({ status: "past_due" }));
    });


    test("does not replay renewal side effects for a duplicate terminal event", async () => {
        transaction.status = "paid";
        transaction.metadata.memberSubscriptionId = "subscription-1";

        const response = await authorizeWebhookRoutes(new Elysia()).handle(request());

        expect(response.status).toBe(200);
        expect(updates).toHaveLength(1);
    });

    test("recovers a response-lost charge from its provider order description", async () => {
        findTransaction
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce(transaction);
        providerDetails.order = { description: `monstro:${transaction.id}` };

        const response = await authorizeWebhookRoutes(new Elysia()).handle(request());

        expect(response.status).toBe(200);
        expect(updates[0]).toEqual(expect.objectContaining({
            status: "paid",
            paymentIntentId: "authorize-transaction-1",
        }));
    });
    test("preserves package limits and saved cards while finalizing held plans", async () => {
        existingInvoice = undefined;
        transaction.metadata = {
            gatewayService: "authorize",
            authorizeIntegrationId: "integration-1",
            checkoutKind: "package",
            memberPlanPricingId: "pricing-1",
            packageClassLimit: 7,
        };

        const packageResponse = await authorizeWebhookRoutes(new Elysia()).handle(request());

        expect(packageResponse.status).toBe(200);
        expect(inserts).toContainEqual(expect.objectContaining({ totalClassLimit: 7 }));

        inserts.length = 0;
        transaction.metadata = {
            gatewayService: "authorize",
            authorizeIntegrationId: "integration-1",
            authorizeCustomerProfileId: "12345",
            checkoutKind: "subscription",
            memberPlanPricingId: "pricing-1",
            subscriptionStartAt: "2030-01-01T00:00:00.000Z",
            subscriptionCurrentPeriodEnd: "2030-02-01T00:00:00.000Z",
            classCredits: 4,
        };
        const subscriptionResponse = await authorizeWebhookRoutes(new Elysia()).handle(request());

        expect(subscriptionResponse.status).toBe(200);
        expect(inserts).toContainEqual(expect.objectContaining({
            gatewayPaymentId: "payment-profile-1",
        }));
    });

    test("completes a reserved event registration after approval", async () => {
        transaction.metadata.checkoutKind = "event";
        transaction.metadata.eventId = "event-1";
        transaction.metadata.ticketId = "ticket-1";
        existingEventRegistration = { id: "registration-1", status: "pending" };

        const response = await authorizeWebhookRoutes(new Elysia()).handle(request());

        expect(response.status).toBe(200);
        expect(updates).toContainEqual(expect.objectContaining({ status: "registered" }));
    });

    test("releases a reserved event registration after a decline", async () => {
        transaction.metadata.checkoutKind = "event";
        transaction.metadata.eventId = "event-1";
        transaction.metadata.ticketId = "ticket-1";
        existingEventRegistration = { id: "registration-1", status: "pending" };
        providerDetails = {
            ...providerDetails,
            transactionStatus: "declined",
            responseCode: 2,
            responseReasonDescription: "Declined",
        };

        const response = await authorizeWebhookRoutes(new Elysia()).handle(request());

        expect(response.status).toBe(200);
        expect(updates).toContainEqual(expect.objectContaining({ status: "cancelled" }));
    });
});
