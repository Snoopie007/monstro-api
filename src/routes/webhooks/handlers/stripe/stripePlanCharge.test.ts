import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";

const invoice = {
    id: "invoice-1",
    transactionId: null as string | null,
    description: "Membership",
    currency: "USD",
    subTotal: 1000,
    tax: 0,
    items: [
        { name: "Membership", quantity: 1, price: 1000 },
        { feeId: "fee-1", refundable: false, name: "Signup fee", quantity: 1, price: 200 },
    ],
};
const inserts: Array<Record<string, unknown>> = [];
let returnedInvoice = false;
let previousPayment: { status: string; failedReason: string | null; failedCode: string | null; paymentIntentId?: string | null } | undefined;
const emittedFailures: string[] = [];
const tx = {
    update: mock(() => ({
        set: mock(() => ({
            where: mock(() => ({
                returning: mock(async () => {
                    if (returnedInvoice) return [];
                    returnedInvoice = true;
                    return [invoice];
                }),
            })),
        })),
    })),
    insert: mock(() => ({
        values: mock((values: Record<string, unknown>) => {
            inserts.push(values);
            return { returning: mock(async () => [{ id: "transaction-1" }]) };
        }),
    })),
    query: {
        transactions: { findFirst: async () => previousPayment },
        memberSubscriptions: { findFirst: mock(async () => undefined) },
    },
};
const db = {
    transaction: mock(async (callback: (transaction: typeof tx) => unknown) => callback(tx)),
};

let handleStripePlanCharge: typeof import("./stripePlanCharge").handleStripePlanCharge;
beforeAll(async () => {
    mock.module("@/db/db", () => ({ db }));
    mock.module("@subtrees/utils/server/workflows", () => ({
        dispatchPaymentFailed: async (_tx: unknown, id: string) => { emittedFailures.push(id); },
    }));
    ({ handleStripePlanCharge } = await import("./stripePlanCharge"));
});

describe("handleStripePlanCharge", () => {
    beforeEach(() => {
        mock.clearAllMocks();
        returnedInvoice = false;
        inserts.length = 0;
        invoice.transactionId = null;
        previousPayment = undefined;
        emittedFailures.length = 0;
    });

    test("copies the charged invoice items to the transaction", async () => {
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
            paymentIntentId: "payment-intent-1",
            feeAmount: 0,
        });

        expect(inserts[0]?.items).toEqual(invoice.items);
    });

    test.each([
        { label: "different known payment", previousId: "old-intent", incomingId: "new-intent", expected: 1 },
        { label: "same payment", previousId: "same-intent", incomingId: "same-intent", expected: 0 },
        { label: "missing previous ID", previousId: null, incomingId: "new-intent", expected: 0 },
        { label: "missing incoming ID", previousId: "old-intent", incomingId: null, expected: 0 },
        { label: "empty previous ID", previousId: "", incomingId: "new-intent", expected: 0 },
        { label: "empty incoming ID", previousId: "old-intent", incomingId: "", expected: 0 },
    ])("recorded failure: $label emits $expected events", async ({ previousId, incomingId, expected }) => {
        invoice.transactionId = "existing-payment";
        previousPayment = { status: "failed", failedReason: "Old decline", failedCode: "card_declined", paymentIntentId: previousId };
        await handleStripePlanCharge({
            invoiceId: invoice.id, memberPlanId: "pkg_1", locationId: "location-1", memberId: "member-1",
            paymentType: "card", failedReason: "New decline", failedCode: "card_declined", success: false,
            receiptUrl: null, amount: 1200, paymentMethodId: "method", paymentIntentId: incomingId, feeAmount: 0,
        });
        expect(emittedFailures).toEqual(expected ? ["existing-payment"] : []);
    });

    test.each([
        { label: "successful payment", success: true, code: null, previousStatus: "failed" },
        { label: "unrecognized failure", success: false, code: "api_error", previousStatus: "failed" },
        { label: "previously paid payment", success: false, code: "card_declined", previousStatus: "paid" },
    ])("a different ID does not bypass $label protection", async ({ success, code, previousStatus }) => {
        invoice.transactionId = "existing-payment";
        previousPayment = { status: previousStatus, failedReason: "Old decline", failedCode: "card_declined", paymentIntentId: "old-intent" };
        await handleStripePlanCharge({
            invoiceId: invoice.id, memberPlanId: "pkg_1", locationId: "location-1", memberId: "member-1",
            paymentType: "card", failedReason: success ? null : "Failure", failedCode: code, success,
            receiptUrl: null, amount: 1200, paymentMethodId: "method", paymentIntentId: "new-intent", feeAmount: 0,
        });
        expect(emittedFailures).toEqual([]);
    });

    test.each([
        { status: "pending", failedReason: null, failedCode: null, expected: 1 },
        { status: "failed", failedReason: null, failedCode: null, expected: 1 },
        { status: "failed", failedReason: "Declined", failedCode: "card_declined", expected: 0 },
        { status: "paid", failedReason: null, failedCode: null, expected: 0 },
    ])("a decline webhook on $status payment emits $expected new workflow events", async ({ expected, ...previous }) => {
        invoice.transactionId = "existing-payment";
        previousPayment = previous;
        await handleStripePlanCharge({
            invoiceId: invoice.id, memberPlanId: "pkg_1", locationId: "location-1", memberId: "member-1",
            paymentType: "card", failedReason: "Declined", failedCode: "card_declined", success: false,
            receiptUrl: null, amount: 1200, paymentMethodId: "method", paymentIntentId: "provider-payment", feeAmount: 0,
        });
        expect(emittedFailures).toEqual(expected ? ["existing-payment"] : []);
    });
});
