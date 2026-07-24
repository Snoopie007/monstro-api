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
    test("returns approved metadata and durable order description", async () => {
        process.env.AUTHORIZE_API_URL = "https://authorize.test/request";
        let body: Record<string, any> | undefined;
        globalThis.fetch = Object.assign(async (_input: URL | RequestInfo, init?: RequestInit) => {
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
            description: "ignored by Authorize correlation",
            referenceId: "ignored",
            note: "test charge",
            metadata: {},
            paymentType: "card",
        });

        expect(result.status).toBe("approved");
        if (result.status !== "approved") throw new Error("Expected approved result");
        expect(result.paymentIntentId).toBe("provider-1");
        expect(result.gatewayMetadata).toEqual(expect.objectContaining({
            gatewayService: "authorize",
            authorizeTransactionId: "provider-1",
            authorizeAvsResultCode: "Y",
            authorizeCavvResultCode: "2",
        }));
        expect(body?.createTransactionRequest?.transactionRequest?.order?.description)
            .toBe("monstro:00000000-0000-4000-8000-000000000001");
        expect(body?.createTransactionRequest?.transactionRequest?.transactionType)
            .toBe("authCaptureTransaction");
    });

    test("distinguishes declined and held responses", async () => {
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
            referenceId: "reference",
            note: "test charge",
            metadata: {},
            paymentType: "card" as const,
        };
        const declined = await chargeWithGateway(input);
        expect(declined).toMatchObject({ status: "failed", failureCode: "E_DECLINED" });

        responseCode = "4";
        const held = await chargeWithGateway(input);
        expect(held).toMatchObject({ status: "held", paymentIntentId: "provider-2" });
    });
});
