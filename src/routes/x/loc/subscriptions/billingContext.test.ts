import { afterEach, describe, expect, mock, test } from "bun:test";

const transaction = mock(async () => "fresh");

mock.module("@/db/db", () => ({
    db: {
        query: {
            locationState: { findFirst: async () => ({ paymentGatewayId: "gateway" }) },
            memberLocations: { findFirst: async () => ({ gatewayCustomerId: "customer" }) },
            integrations: {
                findFirst: async () => ({
                    id: "gateway",
                    locationId: "location",
                    service: "authorize",
                    accessToken: "expired",
                    expires: 0,
                    accountId: "merchant",
                    metadata: {},
                }),
            },
        },
        transaction,
    },
}));

const { BillingContextError, resolveSubscriptionBillingContext } = await import("./billingContext");

const subscription = {
    id: "subscription",
    locationId: "location",
    memberId: "member",
    gatewayPaymentId: "card",
    metadata: {
        deferredBilling: { version: 1, firstPaymentAt: "2026-02-01T09:00:00Z", prorate: false, prorationAmount: 0 },
    },
};

const originalFetch = globalThis.fetch;
const originalApiUrl = process.env.AUTHORIZE_API_URL;
afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.AUTHORIZE_API_URL = originalApiUrl;
});

describe("Authorize.net subscription billing context", () => {
    test("returns the refreshed token, because retries charge with it", async () => {
        process.env.AUTHORIZE_API_URL = "https://apitest.authorize.net/xml/v1/request.api";
        let sentToken: string | undefined;
        globalThis.fetch = Object.assign(async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
            sentToken = JSON.parse(String(init?.body)).getCustomerProfileRequest.merchantAuthentication.accessToken;
            return Response.json({
                messages: { resultCode: "Ok" },
                profile: { paymentProfiles: [{ customerPaymentProfileId: "card" }] },
            });
        }, { preconnect: originalFetch.preconnect });

        const context = await resolveSubscriptionBillingContext(subscription);

        expect(sentToken).toBe("fresh");
        expect(context.gateway.accessToken).toBe("fresh");
    });

    test("reports a dead connection as a billing context error", async () => {
        transaction.mockRejectedValueOnce(new Error("refresh failed"));

        await expect(resolveSubscriptionBillingContext(subscription)).rejects.toBeInstanceOf(BillingContextError);
    });
});
