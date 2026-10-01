import { describe, expect, test } from "bun:test";
import { resolveCashBilling, type CashInvoice } from "@/subtrees/utils/cashBilling";

const sub = { id: "sub", parentId: null, paymentType: "cash", status: "active", startDate: "2026-09-26T16:00:00Z",
    currentPeriodStart: "2026-09-26T16:00:00Z", currentPeriodEnd: "2026-10-02T16:00:00Z" };
const now = new Date("2026-10-02T17:00:00Z");
const invoice: CashInvoice = { id: "invoice", memberPlanId: "sub", status: "draft", paid: false, total: 12500, currency: "USD",
    forPeriodStart: sub.currentPeriodStart, forPeriodEnd: sub.currentPeriodEnd, dueDate: sub.currentPeriodEnd };
const resolve = (invoices: CashInvoice[] = [], overrides = {}) => resolveCashBilling({ ...sub, ...overrides }, invoices, "America/New_York", now);

describe("cash collection state", () => {
    test("an active subscription due today exposes invoice creation", () => {
        expect(resolve()).toMatchObject({ state: "due", action: "create", invoice: null });
    });
    test("an active subscription whose date passed is overdue without a status mutation", () => {
        expect(resolve([], { currentPeriodEnd: "2026-10-01T16:00:00Z" })).toMatchObject({ state: "overdue", action: "create" });
    });
    test("date boundaries use the location timezone", () => {
        expect(resolveCashBilling(sub, [], "America/New_York", new Date("2026-10-03T03:59:00Z"))?.state).toBe("due");
        expect(resolveCashBilling(sub, [], "America/New_York", new Date("2026-10-03T04:00:00Z"))?.state).toBe("overdue");
    });
    test("an older paid invoice cannot hide a new unpaid cycle", () => {
        expect(resolve([{ ...invoice, paid: true, status: "paid", forPeriodStart: "2026-09-19T16:00:00Z", forPeriodEnd: sub.currentPeriodStart }]))
            .toMatchObject({ state: "due", action: "create", invoice: null });
    });
    test.each(["sent", "unpaid"] as const)("an issued %s invoice exposes cash confirmation", status => {
        expect(resolve([{ ...invoice, status }])).toMatchObject({ action: "collect", invoice: { id: "invoice" } });
    });
    test("a draft is reused for sending", () => expect(resolve([invoice])?.action).toBe("send"));
    test("paying this cycle clears its warning", () => expect(resolve([{ ...invoice, paid: true, status: "paid" }])).toMatchObject({ state: "paid", action: null }));
    test("an older outstanding invoice wins over a future draft", () => {
        expect(resolve([{ ...invoice, id: "old", status: "unpaid", dueDate: "2026-09-25T16:00:00Z", forPeriodStart: "2026-09-19T16:00:00Z", forPeriodEnd: sub.currentPeriodStart }, invoice]))
            .toMatchObject({ state: "overdue", action: "collect", invoice: { id: "old" } });
    });
    test("future projected cycles cannot create a different current-cycle invoice", () => {
        expect(resolveCashBilling(sub, [], "America/New_York", now, { periodStart: sub.currentPeriodEnd, periodEnd: "2026-10-09T16:00:00Z" }))
            .toMatchObject({ state: "scheduled", action: null });
    });
    test("a stale or foreign invoice selection never enables creation", () => {
        expect(resolveCashBilling(sub, [invoice], "America/New_York", now, { periodStart: sub.currentPeriodStart, periodEnd: sub.currentPeriodEnd, invoiceId: "foreign" }))
            .toMatchObject({ state: "blocked", action: null });
    });
    test("access-only family members have no cash collection controls", () => expect(resolve([], { parentId: "parent" })).toBeNull());
    test.each(["paused", "canceled"])("a %s subscription cannot prepare or send a new invoice", status => {
        expect(resolve([invoice], { status })).toMatchObject({ state: "blocked", action: "view" });
    });
    test("void invoices require review rather than replacement", () => expect(resolve([{ ...invoice, status: "void" }])).toMatchObject({ state: "blocked", action: "view" }));
});
