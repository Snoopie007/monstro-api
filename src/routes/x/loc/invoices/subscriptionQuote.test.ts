import { beforeEach, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";

let paidInvoice: { id: string } | undefined;
const insertedValues: Array<Record<string, any>> = [];

const additionalFees = [{
    id: "fee-signup",
    locationId: "location-1",
    label: "Signup fee",
    description: null,
    type: "fixed" as const,
    amount: 500,
    checkoutTypes: ["subscription" as const],
    taxable: false,
    refundable: true,
    initialChargeOnly: true,
    active: true,
    created: new Date("2026-08-24T00:00:00Z"),
    updated: null,
}, {
    id: "fee-service",
    locationId: "location-1",
    label: "Service fee",
    description: null,
    type: "percentage" as const,
    amount: 500,
    checkoutTypes: ["subscription" as const],
    taxable: false,
    refundable: false,
    initialChargeOnly: false,
    active: true,
    created: new Date("2026-08-24T00:00:01Z"),
    updated: null,
}];

const findPaidInvoice = mock(async () => paidInvoice);
const subscription = {
    id: "subscription-1",
    memberId: "member-1",
    locationId: "location-1",
    paymentType: "cash",
    metadata: {},
    currentPeriodStart: new Date("2026-08-01T00:00:00Z"),
    currentPeriodEnd: new Date("2026-09-01T00:00:00Z"),
    pricing: {
        name: "Monthly",
        price: 10_000,
        plan: { name: "Unlimited" },
    },
    location: {
        country: "US",
        locationState: { planId: 1 },
        taxRates: [{ percentage: 10, isDefault: true }],
    },
};
const db = {
    query: {
        additionalFees: {
            findMany: mock(async () => additionalFees),
        },
        memberInvoices: {
            findFirst: findPaidInvoice,
        },
        members: {
            findFirst: mock(async () => ({
                id: "member-1",
                firstName: "Test",
                lastName: "Member",
                email: "member@example.com",
            })),
        },
        locations: {
            findFirst: mock(async () => subscription.location),
        },
        memberSubscriptions: {
            findFirst: mock(async () => subscription),
        },
    },
    insert: mock(() => ({
        values: mock((values: Record<string, any>) => {
            insertedValues.push(values);
            return {
                returning: mock(async () => [{
                    ...values,
                    id: insertedValues.length === 1 ? "invoice-1" : "transaction-1",
                }]),
            };
        }),
    })),
    update: mock(() => ({
        set: mock(() => ({
            where: mock(async () => undefined),
        })),
    })),
};
mock.module("@/db/db", () => ({
    db,
}));

const { buildSubscriptionInvoiceQuote } = await import("./subscriptionQuote");
const { createInvoiceRoutes } = await import("./create");
const { previewInvoiceRoutes } = await import("./preview");
const createApp = new Elysia({ prefix: "/x/loc/:lid/invoices" }).use(createInvoiceRoutes);
const previewApp = new Elysia({ prefix: "/x/loc/:lid/invoices" }).use(previewInvoiceRoutes);

const baseInput = {
    locationId: "location-1",
    subscriptionId: "subscription-1",
    subscriptionMetadata: {},
    pricing: {
        name: "Monthly",
        price: 10_000,
        plan: { name: "Unlimited" },
    },
    location: {
        country: "US",
        locationState: { planId: 1 },
        taxRates: [{ percentage: 10, isDefault: true }],
    },
};

beforeEach(() => {
    paidInvoice = undefined;
    insertedValues.length = 0;
    mock.clearAllMocks();
});

test("builds an initial subscription invoice with every applicable fee", async () => {
    const quote = await buildSubscriptionInvoiceQuote(baseInput);

    expect(quote).toMatchObject({
        subTotal: 10_000,
        additionalFeeTotal: 1_000,
        tax: 1_000,
        total: 12_000,
        platformFeeAmount: 220,
        currency: "USD",
    });
    expect(quote.items.map((item) => item.name)).toEqual([
        "Unlimited - Monthly",
        "Signup fee",
        "Service fee",
    ]);
});

test("removes initial-only fees from a subscription renewal", async () => {
    paidInvoice = { id: "invoice-paid" };

    const quote = await buildSubscriptionInvoiceQuote(baseInput);

    expect(quote.additionalFeeTotal).toBe(500);
    expect(quote.total).toBe(11_500);
    expect(quote.items.map((item) => item.name)).toEqual([
        "Unlimited - Monthly",
        "Service fee",
    ]);
});

test("treats imported subscriptions as renewals without searching invoice history", async () => {
    const quote = await buildSubscriptionInvoiceQuote({
        ...baseInput,
        subscriptionMetadata: { additionalFeesStartAtRenewal: true },
    });

    expect(quote.additionalFeeTotal).toBe(500);
    expect(findPaidInvoice).not.toHaveBeenCalled();
});

test("previews subscription invoices with their applied fee lines", async () => {
    const response = await previewApp.handle(new Request(
        "http://localhost/x/loc/location-1/invoices/preview",
        {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                memberId: "member-1",
                type: "from-subscription",
                selectedSubscriptionId: "subscription-1",
            }),
        },
    ));
    const result = await response.json() as {
        preview: {
            amount_due: number;
            formatted_lines: Array<{ description: string }>;
        };
        summary: { additional_fee_cents: number };
    };

    expect(response.status).toBe(200);
    expect(result.preview.amount_due).toBe(12_000);
    expect(result.preview.formatted_lines.map((line: { description: string }) => line.description)).toEqual([
        "Unlimited - Monthly",
        "Signup fee",
        "Service fee",
    ]);
    expect(result.summary.additional_fee_cents).toBe(1_000);
});

test("persists the same subscription fee snapshot used by the preview", async () => {
    const response = await createApp.handle(new Request(
        "http://localhost/x/loc/location-1/invoices",
        {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                memberId: "member-1",
                type: "from-subscription",
                selectedSubscriptionId: "subscription-1",
                paymentType: "cash",
            }),
        },
    ));

    expect(response.status).toBe(201);
    expect(insertedValues[0]).toMatchObject({
        total: 12_000,
        subTotal: 10_000,
        tax: 1_000,
        metadata: {
            type: "from-subscription",
            subscriptionId: "subscription-1",
            platformFeeAmount: 220,
        },
    });
    expect(insertedValues[0]?.items.map((item: { name: string }) => item.name)).toEqual([
        "Unlimited - Monthly",
        "Signup fee",
        "Service fee",
    ]);
    expect(insertedValues[1]).toMatchObject({
        total: 12_000,
        feeAmount: 220,
        items: insertedValues[0]?.items,
    });
});
