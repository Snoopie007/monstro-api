import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";

const originalFetch = globalThis.fetch;
const providerId = "authorize-transaction-1";
const transaction = {
    id: "00000000-0000-4000-8000-000000000001",
    locationId: "location-1",
    memberId: "member-1",
    type: "inbound",
    status: "paid",
    paymentType: "card",
    total: 1250,
    refunded: false,
    refundedAmount: 0,
    paymentIntentId: providerId,
    invoice: null,
    metadata: {
        gatewayService: "authorize",
        authorizeIntegrationId: "integration-1",
        authorizeTransactionId: providerId,
    },
};
type TestTransaction = Omit<typeof transaction, "metadata"> & {
    metadata: Record<string, unknown>;
};
let activeTransaction: TestTransaction = transaction;
const updates: Array<Record<string, unknown>> = [];
let transactionRead = 0;
const db = {
    query: {
        transactions: {
            findFirst: mock(async () => {
                if (activeTransaction.metadata.gatewayService !== "authorize" || transactionRead++ === 0) {
                    return activeTransaction;
                }
                return {
                    ...activeTransaction,
                    refunded: true,
                    refundedAmount: 0,
                    metadata: {
                        ...activeTransaction.metadata,
                        authorizeRefundState: "completed",
                        authorizeRefundOperation: "void",
                        authorizeRefundTransactionId: "void-1",
                    },
                };
            }),
        },
        integrations: { findFirst: mock(async () => ({ apiKey: "login", secretKey: "secret", accessToken: "square-token" })) },
        orders: { findFirst: mock(async () => undefined) },
        eventRegistrations: { findFirst: mock(async () => undefined) },
        courseEnrollments: { findFirst: mock(async () => undefined) },
    },
    update: mock(() => ({
        set: mock((values: Record<string, unknown>) => {
            updates.push(values);
            return {
                where: mock(() => ({ returning: mock(async () => [{ id: transaction.id }]) })),
            };
        }),
    })),
};

mock.module("@/db/db", () => ({ db }));
const { xTransactions } = await import("./root");
const app = new Elysia().group("/x/loc/:lid", app => app.use(xTransactions));

describe("Standalone transaction refund", () => {
    beforeEach(() => {
        mock.clearAllMocks();
        activeTransaction = transaction;
        transactionRead = 0;
        updates.length = 0;
        process.env.AUTHORIZE_API_URL = "https://authorize.test/request";
        globalThis.fetch = Object.assign(async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
            const body = JSON.parse(String(init?.body));
            if (body.getTransactionDetailsRequest) {
                return new Response(JSON.stringify({
                    transaction: {
                        transId: providerId,
                        transactionStatus: "capturedPendingSettlement",
                        payment: {
                            creditCard: {
                                cardNumber: "XXXX0015",
                                expirationDate: "XXXX",
                            },
                        },
                    },
                    messages: { resultCode: "Ok" },
                }));
            }
            return new Response(JSON.stringify({
                transactionResponse: { responseCode: "1", transId: "void-1" },
                messages: { resultCode: "Ok" },
            }));
        }, { preconnect: originalFetch.preconnect });
    });

    afterAll(() => {
        globalThis.fetch = originalFetch;
    });

    test("claims and voids a paid unsettled Charge Item", async () => {
        const response = await app.handle(new Request(
            `http://localhost/x/loc/location-1/transactions/${transaction.id}/refund`,
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ amountType: "full" }),
            },
        ));

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual(expect.objectContaining({
            refunded: true,
            refundId: "void-1",
            amount: 0,
        }));
        expect(updates[0]).toEqual(expect.objectContaining({
            metadata: expect.objectContaining({ authorizeRefundState: "pending" }),
        }));
        expect(updates[1]).toEqual(expect.objectContaining({
            refunded: true,
            metadata: expect.objectContaining({
                authorizeRefundState: "completed",
                authorizeRefundOperation: "void",
                authorizeRefundTransactionId: "void-1",
            }),
        }));
    });

    test("does not claim a refund when the eligibility lookup fails", async () => {
        globalThis.fetch = Object.assign(async () => {
            throw new TypeError("network unavailable");
        }, { preconnect: originalFetch.preconnect });

        const response = await app.handle(new Request(
            `http://localhost/x/loc/location-1/transactions/${transaction.id}/refund`,
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ amountType: "full" }),
            },
        ));

        expect(response.status).toBe(503);
        expect(updates).toHaveLength(0);
    });

    test("rejects an excessive Square partial refund before calling the provider", async () => {
        activeTransaction = {
            ...transaction,
            total: 100,
            paymentIntentId: "square-payment-1",
            metadata: {
                gatewayService: "square",
                squarePaymentId: "square-payment-1",
            },
        };
        const providerFetch = mock(async () => {
            throw new Error("Square should not be called");
        });
        globalThis.fetch = Object.assign(providerFetch, { preconnect: originalFetch.preconnect });

        const response = await app.handle(new Request(
            `http://localhost/x/loc/location-1/transactions/${transaction.id}/refund`,
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ amountType: "partial", amount: 200 }),
            },
        ));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            error: "Refund amount cannot exceed transaction total",
        });
        expect(providerFetch).not.toHaveBeenCalled();
        expect(updates).toHaveLength(0);
    });
});
