import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";

const invoice = { id: "invoice-1" };
const currentInvoice = {
    paid: false,
    status: "unpaid",
    transactionId: null,
    metadata: {} as Record<string, unknown>,
    currency: "USD",
    total: 1200,
    locationId: "location-1",
    memberId: "member-1",
    memberPlanId: "pkg_1",
};
const tx = {
    select: mock(() => ({
        from: mock(() => ({
            where: mock(() => ({
                limit: mock(() => ({ for: mock(async () => [currentInvoice]) })),
            })),
        })),
    })),
    update: mock(() => { throw new Error("Unexpected invoice mutation"); }),
    insert: mock(() => { throw new Error("Unexpected transaction insertion"); }),
    query: {
        integrations: { findFirst: mock(async () => ({ accountId: "acct_1" })) },
    },
};
const db = {
    transaction: mock(async (callback: (transaction: typeof tx) => unknown) => callback(tx)),
    query: { memberInvoices: { findFirst: mock(async () => currentInvoice) } },
};

let handleStripePlanCharge: typeof import("./stripePlanCharge").handleStripePlanCharge;
beforeAll(async () => {
    mock.module("@/db/db", () => ({ db }));
    ({ handleStripePlanCharge } = await import("./stripePlanCharge"));
});

describe("handleStripePlanCharge", () => {
    beforeEach(() => {
        mock.clearAllMocks();
        currentInvoice.metadata = {};
    });

    test.each([["amount", 1199, "USD"], ["currency", 1200, "EUR"]] as const)("rejects a successful webhook with %s mismatch", async (reason, amount, currency) => {
        await expect(handleStripePlanCharge({
            invoiceId: invoice.id,
            memberPlanId: "pkg_1",
            locationId: "location-1",
            memberId: "member-1",
            paymentType: "card",
            failedReason: null,
            failedCode: null,
            success: true,
            receiptUrl: null,
            amount,
            currency,
            paymentMethodId: "payment-method-1",
            paymentIntentId: "payment-intent-2",
            stripeAccountId: "acct_1",
            feeAmount: 0,
        })).rejects.toThrow(`${reason} mismatch`);
        expect(tx.update).not.toHaveBeenCalled();
    });
    test("ignores a webhook owned by an older billing attempt", async () => {
        currentInvoice.metadata = {
            billingAttempt: {
                id: "attempt-new", status: "in_flight", gatewayIntegrationId: "integration-1",
                gatewayCustomerId: "customer-1", stripeAccountId: "acct_1",
                paymentMethodId: "payment-method-1", paymentType: "card",
            },
        };

        await handleStripePlanCharge({
            invoiceId: invoice.id,
            memberPlanId: "pkg_1",
            locationId: "location-1",
            memberId: "member-1",
            paymentType: "card",
            failedReason: null,
            failedCode: null,
            success: true,
            receiptUrl: null,
            amount: 1200,
            paymentMethodId: "payment-method-1",
            paymentIntentId: "payment-intent-old",
            feeAmount: 0,
            billingAttemptId: "attempt-old",
            stripeAccountId: "acct_1",
        });

        await handleStripePlanCharge({
            invoiceId: invoice.id,
            memberPlanId: "pkg_1",
            locationId: "location-1",
            memberId: "member-1",
            paymentType: "card",
            failedReason: "declined",
            failedCode: "card_declined",
            success: false,
            receiptUrl: null,
            amount: 1200,
            paymentMethodId: "payment-method-1",
            paymentIntentId: "payment-intent-old",
            feeAmount: 0,
            billingAttemptId: "attempt-old",
            stripeAccountId: "acct_1",
        });
        expect(tx.update).not.toHaveBeenCalled();
        expect(tx.insert).not.toHaveBeenCalled();
    });
});
