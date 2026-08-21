import { afterEach, describe, expect, test } from "bun:test";
import { chargeWithGateway } from "./checkoutUtil";

const originalFetch = globalThis.fetch;
const originalApiUrl = process.env.AUTHORIZE_API_URL;
const gateway = {
    service: "authorize" as const,
    integrationId: "integration-1",
    apiKey: "login",
    secretKey: "key",
    accountId: "account",
    metadata: {},
};

afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.AUTHORIZE_API_URL = originalApiUrl;
});

describe("chargeWithGateway Authorize.net", () => {
    test("returns approved metadata and preserves the business description", async () => {
        process.env.AUTHORIZE_API_URL = "https://authorize.test/request";
        let body: Record<string, any> | undefined;
    globalThis.fetch = Object.assign(async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
            body = JSON.parse(String(init?.body));
            return new Response(JSON.stringify({
                transactionResponse: {
                    responseCode: "1",
                    transId: "provider-1",
                    avsResultCode: "Y",
                    cavvResultCode: "2",
                },
                messages: { resultCode: "Ok" },
            }));
        }, { preconnect: originalFetch.preconnect });

        const result = await chargeWithGateway({
            gateway,
            gatewayCustomerId: "customer-1",
            paymentMethodId: "card-1",
            transactionId: "00000000-0000-4000-8000-000000000001",
            total: 1250,
            feesAmount: 0,
            currency: "USD",
            description: "Course enrollment",
            note: "test charge",
            metadata: {},
            paymentType: "card",
        });

        expect(result.status).toBe("approved");
        if (result.status !== "approved") throw new Error("Expected approved result");
        expect(result.paymentIntentId).toBe("provider-1");
        expect(result.gatewayMetadata).toEqual(expect.objectContaining({
            gatewayService: "authorize",
            authorizeAvsResultCode: "Y",
            authorizeCavvResultCode: "2",
        }));
        expect(body?.createTransactionRequest?.transactionRequest?.order?.description)
            .toBe("Course enrollment");
        expect(body?.createTransactionRequest?.refId).toBe("00000000-0000-4000-8000-000000000001");
        expect(body?.createTransactionRequest?.transactionRequest?.order?.invoiceNumber)
            .toBe("00000000-0000-4000-8000-000000000001");
        expect(body?.createTransactionRequest?.transactionRequest?.transactionType)
            .toBe("authCaptureTransaction");
    });

    test("treats declined and held responses as failures", async () => {
        process.env.AUTHORIZE_API_URL = "https://authorize.test/request";
        let responseCode = "2";
        globalThis.fetch = Object.assign(async () => new Response(JSON.stringify({
            transactionResponse: {
                responseCode,
                transId: "provider-2",
                errors: { error: [{ errorCode: "E_DECLINED", errorText: "Declined" }] },
            },
            messages: { resultCode: "Ok" },
        })), { preconnect: originalFetch.preconnect });

        const input = {
            gateway,
            gatewayCustomerId: "customer-1",
            paymentMethodId: "card-1",
            transactionId: "00000000-0000-4000-8000-000000000002",
            total: 1250,
            feesAmount: 0,
            currency: "USD",
            description: "description",
            note: "test charge",
            metadata: {},
            paymentType: "card" as const,
        };
        const declined = await chargeWithGateway(input);
        expect(declined).toMatchObject({ status: "failed", failureCode: "E_DECLINED" });

        responseCode = "4";
        const held = await chargeWithGateway(input);
        expect(held).toMatchObject({
            status: "failed",
            failureCode: "4",
        });
        expect(held).not.toHaveProperty("paymentIntentId");
    });

    test("keeps duplicate responses detached from the prior provider transaction", async () => {
        process.env.AUTHORIZE_API_URL = "https://authorize.test/request";
        globalThis.fetch = Object.assign(async () => new Response(JSON.stringify({
            transactionResponse: {
                responseCode: "3",
                responseReasonCode: "11",
                transId: "provider-original",
                errors: { error: [{ errorText: "A duplicate transaction has been submitted." }] },
            },
            messages: { resultCode: "Ok" },
        })), { preconnect: originalFetch.preconnect });

        const result = await chargeWithGateway({
            gateway,
            gatewayCustomerId: "customer-1",
            paymentMethodId: "card-1",
            transactionId: "00000000-0000-4000-8000-000000000003",
            total: 100,
            feesAmount: 0,
            currency: "USD",
            description: "course",
            note: "test charge",
            metadata: {},
            paymentType: "card",
        });

        expect(result).toMatchObject({ status: "failed", failureCode: "11" });
        expect(result).not.toHaveProperty("paymentIntentId");
        expect(result.gatewayMetadata).not.toHaveProperty("authorizeTransactionId");
    });
});
