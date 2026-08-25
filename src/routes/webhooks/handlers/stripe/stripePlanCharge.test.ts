import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";

const invoice = {
    id: "invoice-1",
    transactionId: null,
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
        memberSubscriptions: { findFirst: mock(async () => undefined) },
    },
};
const db = {
    transaction: mock(async (callback: (transaction: typeof tx) => unknown) => callback(tx)),
};

let handleStripePlanCharge: typeof import("./stripePlanCharge").handleStripePlanCharge;
beforeAll(async () => {
    mock.module("@/db/db", () => ({ db }));
    ({ handleStripePlanCharge } = await import("./stripePlanCharge"));
});

describe("handleStripePlanCharge", () => {
    beforeEach(() => {
        mock.clearAllMocks();
        returnedInvoice = false;
        inserts.length = 0;
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
});
