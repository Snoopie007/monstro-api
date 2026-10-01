import { expect, mock, test } from "bun:test";
import type { AdditionalFee } from "@/subtrees/types";

mock.module("@/db/db", () => ({ db: {} }));
const { quoteSubscriptionInvoice } = await import("./subscriptionQuote");

test("forecast quotes include discounted member fees and tax without subtracting the platform fee", () => {
    const result = quoteSubscriptionInvoice({
        locationId: "loc1",
        subscriptionId: "sub1",
        pricing: {
            id: "price1",
            name: "Unlimited",
            price: 10000,
            interval: "month",
            intervalThreshold: 1,
            plan: { locationId: "loc1" },
        },
        location: {
            country: "US",
            locationState: { planId: 1 },
            taxRates: [{ percentage: 10, isDefault: true }],
        },
        billingPhase: "renewal",
        discount: { type: "percentage", value: 10 },
        additionalFees: [
            {
                id: "fixed",
                label: "Facility fee",
                type: "fixed",
                amount: 1000,
                taxable: true,
                refundable: false,
            },
            {
                id: "percent",
                label: "Service fee",
                type: "percentage",
                amount: 1000,
                taxable: false,
                refundable: true,
            },
        ] as AdditionalFee[],
    });
    expect(result.total).toBe(11790);
    expect(result.subTotal).toBe(9000);
    expect(result.tax).toBe(990);
    expect(result.additionalFeeTotal).toBe(1800);
    expect(result.platformFeeAmount).toBe(198);
    expect(result.currency).toBe("USD");
});

test("access-only family subscriptions cannot produce a quote", () => {
    expect(() =>
        quoteSubscriptionInvoice({
            locationId: "loc1",
            subscriptionId: "child",
            parentId: "sub1",
            pricing: {
                id: "price1",
                name: "Unlimited",
                price: 10000,
                interval: "month",
                intervalThreshold: 1,
                plan: { locationId: "loc1" },
            },
            location: { country: "US", taxRates: [] },
            billingPhase: "renewal",
            additionalFees: [],
        }),
    ).toThrow("Access-only");
});
