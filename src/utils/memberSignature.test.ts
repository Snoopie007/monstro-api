import { beforeEach, expect, mock, test } from "bun:test";

const sentEmails: Array<{ template: string; options: { to: string; subject: string }; data: Record<string, unknown> }> = [];
let doc: Record<string, unknown>;

const tx = {
    // Location state, member location, then the locked document.
    select: mock(() => ({
        from: () => ({
            where: () => ({
                for: async () => {
                    const call = tx.select.mock.calls.length;
                    return call === 1 ? [{ waiverId: null }] : call === 2 ? [{ signedWaiverId: null }] : [{ id: "mc_1" }];
                },
            }),
        }),
    })),
    query: { memberContracts: { findFirst: mock(async () => doc) } },
    update: mock(() => ({ set: () => ({ where: async () => undefined }) })),
};

mock.module("@/db/db", () => ({
    db: { transaction: async (callback: (value: typeof tx) => unknown) => callback(tx) },
}));
mock.module("@/libs/email", () => ({
    EmailSender: class {
        async sendWithTemplate(props: (typeof sentEmails)[number]) {
            sentEmails.push(props);
        }
    },
}));

const { signMemberDocument } = await import("./memberSignature");

const member = { id: "member-1", firstName: "Alex", email: "alex@example.com" };
const location = { id: "location-1", name: "Demo Gym" };

beforeEach(() => {
    sentEmails.length = 0;
    tx.select.mockClear();
    doc = {
        id: "mc_1",
        templateId: "waiver-1",
        signedOn: null,
        signature: null,
        pricing: null,
        contractTemplate: { locationId: "location-1", type: "waiver", requireSignature: true },
        member,
        location,
    };
});

test("emails the member after their first signature", async () => {
    const result = await signMemberDocument({ mid: "member-1", lid: "location-1", did: "mc_1", signature: "data:image/png;base64,abc" });

    expect(result.newlySigned).toBe(true);
    expect(sentEmails).toEqual([{
        template: "DocSignedEmail",
        options: { to: "alex@example.com", subject: "Your waiver for Demo Gym is signed" },
        data: { member, location, docType: "Waiver" },
    }]);
});

test("doesn't email again for a document that was already signed", async () => {
    doc = { ...doc, signedOn: new Date("2026-10-01T00:00:00.000Z"), signature: "data:image/png;base64,abc" };
    const result = await signMemberDocument({ mid: "member-1", lid: "location-1", did: "mc_1" });

    expect(result.newlySigned).toBe(false);
    expect(sentEmails).toHaveLength(0);
});
