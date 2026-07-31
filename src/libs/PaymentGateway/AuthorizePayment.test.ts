import { afterEach, describe, expect, test } from "bun:test";
import { AuthorizePaymentGateway } from "./AuthorizePayment";

const originalFetch = globalThis.fetch;
const originalApiUrl = process.env.AUTHORIZE_API_URL;
afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.AUTHORIZE_API_URL = originalApiUrl;
});

describe("AuthorizePaymentGateway", () => {
    test("uses the configured endpoint and Authorize.net field order", async () => {
        process.env.AUTHORIZE_API_URL = "https://apitest.authorize.net/xml/v1/request.api";
        let requestUrl = "";
        let requestBody: Record<string, Record<string, unknown>> = {};
        globalThis.fetch = Object.assign(async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
            requestUrl = String(input);
            requestBody = JSON.parse(String(init?.body));
            return new Response(JSON.stringify({
                customerPaymentProfileId: "1001",
                messages: { resultCode: "Ok", message: [{ code: "I00001", text: "Successful." }] },
            }));
        }, { preconnect: originalFetch.preconnect });

        const gateway = new AuthorizePaymentGateway({ name: "login", transactionKey: "transaction-key" });
        await gateway.createPaymentProfile({
            customerProfileId: "12345",
            dataDescriptor: "COMMON.ACCEPT.INAPP.PAYMENT",
            dataValue: "opaque-token",
            name: "Test Member",
        });

        expect(requestUrl).toBe("https://apitest.authorize.net/xml/v1/request.api");
        expect(Object.keys(requestBody.createCustomerPaymentProfileRequest ?? {})).toEqual([
            "merchantAuthentication",
            "customerProfileId",
            "paymentProfile",
            "validationMode",
        ]);
        expect(requestBody.createCustomerPaymentProfileRequest?.validationMode).toBe("testMode");
        expect(JSON.stringify(requestBody)).not.toContain("cardNumber");
    });

    test("authenticates requests with only an OAuth access token", async () => {
        process.env.AUTHORIZE_API_URL = "https://authorize.test/request";
        let requestBody: Record<string, Record<string, unknown>> = {};
        globalThis.fetch = Object.assign(async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
            requestBody = JSON.parse(String(init?.body));
            return new Response(JSON.stringify({
                profile: { customerProfileId: "12345" },
                messages: { resultCode: "Ok", message: [{ code: "I00001", text: "Successful." }] },
            }));
        }, { preconnect: originalFetch.preconnect });

        const gateway = new AuthorizePaymentGateway({ accessToken: "oauth-access-token" });
        await gateway.getCustomerProfile("12345");

        const request = requestBody.getCustomerProfileRequest;
        expect(request?.merchantAuthentication).toEqual({ accessToken: "oauth-access-token" });
        expect(Object.keys(request ?? {})).toEqual([
            "merchantAuthentication",
            "customerProfileId",
            "unmaskExpirationDate",
        ]);
    });

    test("charges a saved customer profile in cents", async () => {
        process.env.AUTHORIZE_API_URL = "https://authorize.test/request";
        let requestBody: Record<string, Record<string, unknown>> = {};
        globalThis.fetch = Object.assign(async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
            requestBody = JSON.parse(String(init?.body));
            return new Response(JSON.stringify({
                transactionResponse: { responseCode: "1", transId: "80057516014" },
                messages: { resultCode: "Ok", message: [{ code: "I00001", text: "Successful." }] },
            }));
        }, { preconnect: originalFetch.preconnect });

        const gateway = new AuthorizePaymentGateway({ name: "login", transactionKey: "transaction-key" });
        const result = await gateway.createCharge("12345", "1001", {
            total: 100,
            currency: "USD",
            idempotencyKey: "checkout-attempt-1",
            referenceId: "0123456789abcdef0123",
            orderDescription: "monstro:checkout-attempt-1",
        });

        const request = requestBody.createTransactionRequest;
        expect(request?.refId).toBe("0123456789abcdef0123");
        expect(request?.transactionRequest).toEqual(expect.objectContaining({
            transactionType: "authCaptureTransaction",
            amount: "1.00",
            currencyCode: "USD",
            profile: {
                customerProfileId: "12345",
                paymentProfile: { paymentProfileId: "1001" },
            },
            order: {
                invoiceNumber: "0123456789abcdef0123",
                description: "monstro:checkout-attempt-1",
            },
            processingOptions: { isStoredCredentials: true },
        }));
        expect(Object.keys(request?.transactionRequest as Record<string, unknown>)).toEqual([
            "transactionType",
            "amount",
            "currencyCode",
            "profile",
            "order",
            "transactionSettings",
            "processingOptions",
        ]);
        expect(result?.transactionId).toBe("80057516014");
    });

    test("does not return the original provider ID for a duplicate transaction", async () => {
        process.env.AUTHORIZE_API_URL = "https://authorize.test/request";
        globalThis.fetch = Object.assign(async () => new Response(JSON.stringify({
            transactionResponse: {
                responseCode: "3",
                responseReasonCode: "11",
                transId: "80057516014",
                errors: { error: [{ errorText: "A duplicate transaction has been submitted." }] },
            },
            messages: { resultCode: "Ok" },
        })), { preconnect: originalFetch.preconnect });

        const gateway = new AuthorizePaymentGateway({ name: "login", transactionKey: "transaction-key" });
        const result = await gateway.createCharge("12345", "1001", {
            total: 100,
            currency: "USD",
            idempotencyKey: "checkout-attempt-2",
            referenceId: "abcdef0123456789abcd",
            orderDescription: "monstro:checkout-attempt-2",
        });

        expect(result).toMatchObject({ status: "failed", failureCode: "11" });
        expect(result).not.toHaveProperty("transactionId");
    });
});

test("inspects and follows provider transaction state", async () => {
    process.env.AUTHORIZE_API_URL = "https://authorize.test/request";
    const operations: string[] = [];
    let followOnKeys: string[] = [];
    globalThis.fetch = Object.assign(async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
        const body = JSON.parse(String(init?.body));
        if (body.getTransactionDetailsRequest) {
            operations.push("details");
            return new Response(JSON.stringify({
                transaction: { transId: "provider-1", transactionStatus: "settledSuccessfully" },
                messages: { resultCode: "Ok" },
            }));
        }
        const transactionRequest = body.createTransactionRequest.transactionRequest;
        operations.push(transactionRequest.transactionType);
        followOnKeys = Object.keys(transactionRequest);
        return new Response(JSON.stringify({
            transactionResponse: {
                responseCode: "1",
                transId: "provider-refund",
                transactionStatus: "refundPendingSettlement",
            },
            messages: { resultCode: "Ok" },
        }));
    }, { preconnect: originalFetch.preconnect });

    const gateway = new AuthorizePaymentGateway({ name: "login", transactionKey: "transaction-key" });
    const details = await gateway.getTransactionDetails("provider-1");
    expect(details.transactionStatus).toBe("settledSuccessfully");
    const refund = await gateway.refundTransaction("provider-1", 100, "0015");
    expect(refund.transId).toBe("provider-refund");
    expect(operations).toEqual(["details", "refundTransaction"]);
    expect(followOnKeys).toEqual(["transactionType", "amount", "payment", "refTransId"]);
});

test("surfaces a singleton follow-on provider error", async () => {
    process.env.AUTHORIZE_API_URL = "https://authorize.test/request";
    globalThis.fetch = Object.assign(async () => new Response(JSON.stringify({
        transactionResponse: {
            responseCode: "3",
            errors: {
                error: {
                    errorCode: "54",
                    errorText: "The referenced transaction does not meet the criteria for issuing a credit.",
                },
            },
        },
        messages: { resultCode: "Ok" },
    })), { preconnect: originalFetch.preconnect });

    const gateway = new AuthorizePaymentGateway({ name: "login", transactionKey: "transaction-key" });
    expect(gateway.refundTransaction("provider-1", 100, "0015"))
        .rejects.toThrow("does not meet the criteria");
});
