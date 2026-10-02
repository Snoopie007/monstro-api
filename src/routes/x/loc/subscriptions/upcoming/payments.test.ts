import { describe, expect, test } from "bun:test";
import {
    calculateUpcomingPayments,
    remainingMonthWindow,
    type UpcomingInvoice,
    type UpcomingSchedule,
    type UpcomingSubscription,
} from "./payments";

const date = (value: string) => new Date(`${value}T12:00:00.000Z`);
const now = date("2026-10-02");

function subscription(
    overrides: Partial<UpcomingSubscription> = {},
): UpcomingSubscription {
    return {
        id: "sub1",
        parentId: null,
        locationId: "loc1",
        memberId: "member1",
        member: { firstName: "Jasper", lastName: "McLean" },
        memberPlanPricingId: "price1",
        promoId: null,
        metadata: {},
        paymentType: "card",
        gatewayPaymentId: "pm1",
        status: "active",
        startDate: date("2026-09-26"),
        currentPeriodStart: date("2026-09-26"),
        currentPeriodEnd: date("2026-10-03"),
        trialEnd: null,
        cancelAt: null,
        cancelAtPeriodEnd: false,
        pricing: {
            id: "price1",
            name: "Weekly",
            price: 10000,
            interval: "week",
            intervalThreshold: 1,
            plan: { locationId: "loc1" },
        },
        ...overrides,
    };
}

function invoice(overrides: Partial<UpcomingInvoice> = {}): UpcomingInvoice {
    return {
        id: "inv1",
        memberPlanId: "sub1",
        dueDate: date("2026-10-03"),
        forPeriodStart: date("2026-10-03"),
        forPeriodEnd: date("2026-10-10"),
        status: "sent",
        paid: false,
        total: 14999,
        currency: "USD",
        paymentType: "card",
        metadata: {},
        renewalKey: "sub1:2026-10-03T12:00:00.000Z",
        ...overrides,
    };
}

function forecast(
    overrides: Partial<Parameters<typeof calculateUpcomingPayments>[0]> = {},
) {
    return calculateUpcomingPayments({
        subscriptions: [subscription()],
        invoices: [],
        schedules: new Map([
            ["sub1", { dueAt: date("2026-10-03"), cycleCount: 1 }],
        ]),
        paidCounts: new Map(),
        currency: "USD",
        timezone: "America/New_York",
        now,
        canMarkPaid: true,
        quote: (sub, _phase, discount) => ({
            total: (sub.pricing?.price ?? 0) - (discount?.value ?? 0),
            currency: "USD",
        }),
        ...overrides,
    });
}

describe("remaining membership payments", () => {
    test("keeps earlier rows when a later cycle has invalid cadence", () => {
        const result = forecast({
            schedules: new Map([
                [
                    "sub1",
                    {
                        dueAt: date("2026-10-03"),
                        cycleCount: 1,
                        nextDueAt: (after) => {
                            if (
                                after.getTime() === date("2026-10-03").getTime()
                            )
                                return date("2026-10-10");
                            throw new Error("Invalid schedule");
                        },
                    },
                ],
            ]),
        });
        expect(result.automatic.rows).toHaveLength(2);
        expect(result.automatic.rows[1]).toMatchObject({
            dueAt: date("2026-10-10").toISOString(),
            state: "blocked",
            amountMinor: null,
            periodStart: null,
            periodEnd: null,
            reason: "Membership billing cadence is unavailable",
        });
        expect(result.totals).toEqual([
            { currency: "USD", amountMinor: 10000 },
        ]);
    });

    test("stops at a quote failure and retains an unknown amount", () => {
        const result = forecast({
            quote: () => {
                throw new Error("Missing price");
            },
        });
        expect(result.automatic.rows).toHaveLength(1);
        expect(result.automatic.rows[0]).toMatchObject({
            state: "blocked",
            amountMinor: null,
            reason: "Membership billing amount is unavailable",
        });
    });

    test("blocks a schedule that does not advance", () => {
        const result = forecast({
            schedules: new Map([
                [
                    "sub1",
                    {
                        dueAt: date("2026-10-03"),
                        cycleCount: 1,
                        nextDueAt: (after) => after,
                    },
                ],
            ]),
        });
        expect(result.automatic.rows).toHaveLength(1);
        expect(result.automatic.rows[0]?.reason).toBe(
            "Membership billing cadence is unavailable",
        );
    });

    test("uses the location's day and month boundaries, including DST", () => {
        expect(
            remainingMonthWindow(
                new Date("2026-10-01T02:00:00Z"),
                "America/Los_Angeles",
            ),
        ).toMatchObject({
            from: "2026-09-30T07:00:00.000Z",
            untilExclusive: "2026-10-01T07:00:00.000Z",
            refreshAt: "2026-10-01T07:00:00.000Z",
        });
        expect(
            remainingMonthWindow(date("2026-11-01"), "America/New_York"),
        ).toMatchObject({
            from: "2026-11-01T04:00:00.000Z",
            untilExclusive: "2026-12-01T05:00:00.000Z",
            refreshAt: "2026-11-02T05:00:00.000Z",
        });
    });

    test("includes every weekly occurrence and sums before pagination", () => {
        const result = forecast({ options: { pageSize: 2, automaticPage: 2 } });
        expect(result.automatic.total).toBe(5);
        expect(result.automatic.rows.map((row) => row.dueAt)).toEqual([
            date("2026-10-17").toISOString(),
            date("2026-10-24").toISOString(),
        ]);
        expect(result.totals).toEqual([
            { currency: "USD", amountMinor: 50000 },
        ]);
        expect(result.preview).toHaveLength(5);
    });

    test("uses the invoice total and suppresses its estimate", () => {
        const result = forecast({ invoices: [invoice()] });
        expect(result.automatic.total).toBe(5);
        expect(result.preview[0]).toMatchObject({
            id: "inv1",
            amountMinor: 14999,
            source: "invoice",
            canMarkPaid: false,
        });
        expect(result.totals[0]?.amountMinor).toBe(54999);
    });

    test("matches legacy cash invoices to the period ending on the due date", () => {
        const result = forecast({
            subscriptions: [subscription({ paymentType: "cash" })],
            schedules: new Map(),
            invoices: [
                invoice({
                    paymentType: "cash",
                    renewalKey: null,
                    forPeriodStart: date("2026-09-26"),
                    forPeriodEnd: date("2026-10-03"),
                }),
            ],
        });
        expect(result.manual.total).toBe(5);
        expect(result.manual.rows[0]).toMatchObject({
            id: "inv1",
            canMarkPaid: true,
        });
        expect(result.automatic.total).toBe(0);
    });

    test("draft invoices and estimates cannot be marked paid", () => {
        const result = forecast({
            subscriptions: [subscription({ paymentType: "cash" })],
            schedules: new Map(),
            invoices: [
                invoice({
                    paymentType: "cash",
                    status: "draft",
                    renewalKey: null,
                    forPeriodStart: date("2026-09-26"),
                    forPeriodEnd: date("2026-10-03"),
                }),
            ],
        });
        expect(result.manual.rows.every((row) => !row.canMarkPaid)).toBe(true);
    });

    test("payment permissions control the action independently of invoice status", () => {
        expect(
            forecast({
                invoices: [invoice({ paymentType: "cash" })],
                canMarkPaid: false,
            }).manual.rows[0]?.canMarkPaid,
        ).toBe(false);
    });

    test.each(["paid", "void"] as const)(
        "does not regenerate a %s invoice",
        (status) => {
            const result = forecast({
                invoices: [invoice({ status, paid: status === "paid" })],
            });
            expect(result.automatic.total).toBe(4);
            expect(result.totals[0]?.amountMinor).toBe(40000);
        },
    );

    test("an invoice moved outside the window suppresses its original projection", () => {
        const result = forecast({
            invoices: [invoice({ dueDate: date("2026-11-01") })],
        });
        expect(result.automatic.total).toBe(4);
        expect(
            result.preview.some(
                (row) => row.dueAt === date("2026-10-03").toISOString(),
            ),
        ).toBe(false);
    });

    test("family access subscriptions never add collections", () => {
        const result = forecast({
            subscriptions: [
                subscription(),
                subscription({ id: "child", parentId: "sub1" }),
            ],
        });
        expect(result.automatic.total).toBe(5);
        expect(
            result.preview.every((row) => row.subscriptionId === "sub1"),
        ).toBe(true);
    });

    test.each(["canceled", "paused"])(
        "keeps a real payable invoice without projecting a %s membership",
        (status) => {
            const result = forecast({
                subscriptions: [subscription({ status })],
                invoices: [invoice()],
            });
            expect(result.automatic.total).toBe(1);
            expect(result.preview[0]?.source).toBe("invoice");
        },
    );

    test("stops charges at the cancellation boundary", () => {
        expect(
            forecast({
                subscriptions: [subscription({ cancelAt: date("2026-10-17") })],
            }).automatic.total,
        ).toBe(2);
        expect(
            forecast({
                subscriptions: [subscription({ cancelAtPeriodEnd: true })],
            }).automatic.total,
        ).toBe(0);
    });

    test("starts a scheduled trial at its first charge", () => {
        const result = forecast({
            subscriptions: [
                subscription({
                    status: "trialing",
                    trialEnd: date("2026-10-05"),
                }),
            ],
            schedules: new Map([
                ["sub1", { dueAt: date("2026-10-05"), cycleCount: 1 }],
            ]),
        });
        expect(result.preview[0]?.dueAt).toBe(date("2026-10-05").toISOString());
        expect(result.automatic.total).toBe(4);
    });

    test("excludes unscheduled signups and unconfigured automatic trials", () => {
        expect(
            forecast({
                subscriptions: [subscription({ status: "incomplete" })],
                schedules: new Map(),
            }).preview,
        ).toHaveLength(0);
        expect(
            forecast({
                subscriptions: [
                    subscription({
                        status: "trialing",
                        gatewayPaymentId: null,
                        trialEnd: date("2026-10-05"),
                    }),
                ],
                schedules: new Map(),
            }).preview,
        ).toHaveLength(0);
    });

    test("includes a scheduled future first payment", () => {
        const result = forecast({
            subscriptions: [
                subscription({
                    status: "incomplete",
                    startDate: date("2026-10-05"),
                }),
            ],
            schedules: new Map([
                ["sub1", { dueAt: date("2026-10-05"), cycleCount: 1 }],
            ]),
        });
        expect(result.preview[0]?.dueAt).toBe(date("2026-10-05").toISOString());
    });

    test("expires discounts using the actual upcoming cycle count", () => {
        const schedule: UpcomingSchedule = {
            dueAt: date("2026-10-03"),
            cycleCount: 2,
            discount: { amount: 2500, duration: 2 },
        };
        const result = forecast({
            schedules: new Map([["sub1", schedule]]),
            paidCounts: new Map([["sub1", 1]]),
        });
        expect(result.preview.map((row) => row.amountMinor)).toEqual([
            7500, 10000, 10000, 10000, 10000,
        ]);
        expect(result.totals[0]?.amountMinor).toBe(47500);
    });

    test("does not restore a once-only promotion exhausted during activation", () => {
        const result = forecast({
            subscriptions: [
                subscription({
                    metadata: {
                        promo: { discount: { amount: 2500, duration: 1 } },
                    },
                }),
            ],
            paidCounts: new Map([["sub1", 1]]),
        });
        expect(result.preview.map((row) => row.amountMinor)).toEqual([
            10000, 10000, 10000, 10000, 10000,
        ]);
    });

    test("cash uses its original promotion and paid count, not a worker inspection discount", () => {
        const result = forecast({
            subscriptions: [
                subscription({
                    paymentType: "cash",
                    metadata: {
                        promo: { discount: { amount: 2500, duration: 2 } },
                    },
                }),
            ],
            schedules: new Map(),
            paidCounts: new Map([["sub1", 1]]),
        });
        expect(result.preview.map((row) => row.amountMinor)).toEqual([
            7500, 10000, 10000, 10000, 10000,
        ]);
    });

    test.each(["processing", "in_flight", "unknown"])(
        "does not count a %s charge as another upcoming collection",
        (status) => {
            const result = forecast({
                invoices: [
                    invoice({ metadata: { billingAttempt: { status } } }),
                ],
            });
            expect(result.preview).toHaveLength(1);
            expect(result.preview[0]?.state).toBe("processing");
            expect(result.totals[0]?.amountMinor).toBe(0);
        },
    );

    test("does not count blocked automatic billing as expected collection", () => {
        const result = forecast({ schedules: new Map() });
        expect(result.preview[0]?.state).toBe("blocked");
        expect(result.totals[0]?.amountMinor).toBe(0);
    });

    test("does not advance an overdue cash cycle into the remaining month", () => {
        const result = forecast({
            subscriptions: [
                subscription({
                    paymentType: "cash",
                    currentPeriodEnd: date("2026-10-01"),
                }),
            ],
            schedules: new Map(),
        });
        expect(result.preview).toHaveLength(0);
    });

    test("keeps currencies separate and clamps pages after collections disappear", () => {
        const result = forecast({
            subscriptions: [subscription({ status: "paused" })],
            invoices: [
                invoice(),
                invoice({
                    id: "inv2",
                    currency: "EUR",
                    dueDate: date("2026-10-04"),
                }),
            ],
            options: { automaticPage: 5 },
        });
        expect(result.totals).toEqual([
            { currency: "USD", amountMinor: 14999 },
            { currency: "EUR", amountMinor: 14999 },
        ]);
        expect(result.automatic.page).toBe(1);
    });

    test("filters the summary and rows consistently", () => {
        const result = forecast({
            invoices: [invoice({ paymentType: "cash" })],
            options: { collection: "manual" },
        });
        expect(result.automatic.total).toBe(0);
        expect(result.totals[0]?.amountMinor).toBe(14999);
    });
});
