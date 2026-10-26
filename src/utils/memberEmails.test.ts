import { beforeEach, describe, expect, mock, test } from "bun:test";

type SentEmail = {
    template: string;
    options: { to: string; subject: string };
    data: Record<string, any>;
};

const sent: SentEmail[] = [];
let sendError: Error | null = null;
class EmailSender {
    async sendWithTemplate(props: SentEmail) {
        if (sendError) throw sendError;
        sent.push(props);
    }
}
const findDocs = mock(async () => []);

mock.module("@/libs/email", () => ({ EmailSender }));
mock.module("@/db/db", () => ({ db: { query: { memberContracts: { findMany: findDocs } } } }));

const {
    DOC_REQUEST_EMAILS_ENABLED,
    enrollPlanName,
    enrollReceipt,
    sendDocRequestEmail,
    sendDocRequestEmails,
    sendDocSignedEmail,
    sendEnrollEmail,
} = await import("./memberEmails");
const { calculateChargeDetails } = await import("./enrollUtils");

const member = { id: "member-1", firstName: "Alex", lastName: "Rivera", email: "alex@example.com" };
const location = {
    id: "location-1",
    name: "Demo Gym",
    address: "1 Main St",
    email: "gym@example.com",
    phone: "555-0100",
    locationState: { currency: "USD" },
};
const fees = [
    { id: "fee-1", label: "Facility fee", type: "fixed" as const, amount: 1500, taxable: true, refundable: false },
    { id: "fee-2", label: "Card fee", type: "percentage" as const, amount: 300, taxable: false, refundable: false },
];

beforeEach(() => {
    sent.length = 0;
    sendError = null;
    findDocs.mockClear();
});

describe("enrollReceipt", () => {
    for (const [name, discount] of [
        ["no discount", undefined],
        ["percentage discount", { type: "percentage" as const, value: 25 }],
        ["fixed discount", { type: "fixed_amount" as const, value: 3000 }],
    ] as const) {
        test(`its lines add up to the charged total with ${name}`, () => {
            const charge = calculateChargeDetails({ amount: 12000, discount, taxRate: 8, planId: 1, additionalFees: fees });
            const receipt = enrollReceipt("inv_1", new Date("2026-10-27T12:00:00.000Z"), charge);

            expect(receipt.subtotal).toBe(12000);
            expect(receipt.fees).toBe(1500 + 360);
            expect(receipt.subtotal + receipt.fees - receipt.discount + receipt.tax).toBe(charge.total);
            expect(receipt.total).toBe(charge.total);
        });
    }

    test("a free plan shows its price, an equal discount and a zero total", () => {
        const charge = calculateChargeDetails({
            amount: 12000,
            discount: { type: "percentage", value: 100 },
            taxRate: 8,
            planId: 1,
            additionalFees: fees,
        });

        expect(enrollReceipt("inv_1", new Date(), charge)).toEqual(expect.objectContaining({
            subtotal: 12000,
            discount: 12000,
            fees: 0,
            tax: 0,
            total: 0,
        }));
    });
});

test("enrollPlanName adds the pricing name only when it differs", () => {
    expect(enrollPlanName("Adult Unlimited", "Monthly")).toBe("Adult Unlimited - Monthly");
    expect(enrollPlanName("Adult Unlimited", "Adult Unlimited")).toBe("Adult Unlimited");
    expect(enrollPlanName("Adult Unlimited", "")).toBe("Adult Unlimited");
});

describe("sendEnrollEmail", () => {
    const charge = calculateChargeDetails({ amount: 12000, taxRate: 8, planId: 1, additionalFees: [] });
    const input = {
        member,
        location,
        planType: "subscription" as const,
        planName: "Adult Unlimited - Monthly",
        invoiceId: "inv_1",
        paidDate: new Date("2026-10-27T12:00:00.000Z"),
        charge,
    };

    test("sends the receipt to the member", async () => {
        await sendEnrollEmail(input);

        expect(sent).toEqual([{
            template: "EnrollEmail",
            options: { to: "alex@example.com", subject: "Your enrollment at Demo Gym is confirmed" },
            data: {
                member: { firstName: "Alex", lastName: "Rivera" },
                location: { id: "location-1", name: "Demo Gym", address: "1 Main St", email: "gym@example.com", phone: "555-0100" },
                planType: "subscription",
                planName: "Adult Unlimited - Monthly",
                receipt: enrollReceipt("inv_1", input.paidDate, charge),
            },
        }]);
    });

    test("a failed send doesn't throw", async () => {
        sendError = new Error("SendGrid is down");
        await expect(sendEnrollEmail(input)).resolves.toBeUndefined();
    });
});

describe("document emails", () => {
    const waiver = {
        id: "mc_waiver",
        contractTemplate: { type: "waiver" as const, requireSignature: true },
        member,
        location,
    };
    const agreement = {
        ...waiver,
        id: "mc_agreement",
        contractTemplate: { type: "contract" as const, requireSignature: false },
    };

    test("the signed confirmation names the document type", async () => {
        await sendDocSignedEmail(waiver);

        expect(sent).toEqual([expect.objectContaining({
            template: "DocSignedEmail",
            options: { to: "alex@example.com", subject: "Your waiver for Demo Gym is signed" },
            data: expect.objectContaining({ docType: "Waiver", member: { id: "member-1", firstName: "Alex" } }),
        })]);
    });

    test("the signing request passes the doc ID and whether a signature is required", async () => {
        await sendDocRequestEmail(agreement);

        expect(sent).toEqual([expect.objectContaining({
            template: "DocRequestEmail",
            options: { to: "alex@example.com", subject: "Please review your agreement for Demo Gym" },
            data: expect.objectContaining({ docId: "mc_agreement", docType: "Agreement", requireSignature: false }),
        })]);
    });

    test("signing requests stay off until the portal signing page exists", async () => {
        expect(DOC_REQUEST_EMAILS_ENABLED).toBe(false);
        await sendDocRequestEmails(["mc_waiver"]);

        expect(findDocs).not.toHaveBeenCalled();
        expect(sent).toHaveLength(0);
    });

    test("a failed send doesn't throw", async () => {
        sendError = new Error("SendGrid is down");
        await expect(sendDocSignedEmail(waiver)).resolves.toBeUndefined();
        await expect(sendDocRequestEmail(waiver)).resolves.toBeUndefined();
    });
});
