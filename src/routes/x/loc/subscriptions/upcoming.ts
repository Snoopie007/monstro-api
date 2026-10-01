import { db } from "@/db/db";
import { subQueue } from "@/queues/subscriptions";
import { memberInvoices, memberSubscriptions } from "@/subtrees/schemas";
import type { Currency } from "@/subtrees/types/currency";
import { getCurrency } from "@/utils/getCurrency";
import {
    canAccessLocation,
    canEditLocationMember,
} from "@/utils/locationAccess";
import { defaultRepeatStrategy } from "bullmq";
import { and, count, eq, gte, isNotNull, isNull, lt, or } from "drizzle-orm";
import type Elysia from "elysia";
import { t } from "elysia";
import { quoteSubscriptionInvoice } from "../invoices/subscriptionQuote";
import {
    calculateUpcomingPayments,
    remainingMonthWindow,
    type UpcomingSchedule,
} from "./upcomingPayments";

export async function loadSchedules(subscriptionIds: Set<string>) {
    const [schedulers, pending, failed] = await Promise.all([
        subQueue.getJobSchedulers(0, -1, true),
        subQueue.getJobs(
            ["delayed", "waiting", "active", "prioritized"],
            0,
            -1,
            true,
        ),
        subQueue.getJobs(["failed"], 0, -1, true),
    ]);
    const schedules = new Map<string, UpcomingSchedule>();
    for (const scheduler of schedulers) {
        const data = scheduler.template?.data;
        if (!data?.sid || !subscriptionIds.has(data.sid) || !scheduler.next)
            continue;
        schedules.set(data.sid, {
            dueAt: new Date(scheduler.next),
            cycleCount: (scheduler.iterationCount ?? 0) + 1,
            discount: data.discount,
            nextDueAt: scheduler.pattern
                ? (after) => {
                      const next = defaultRepeatStrategy(after.getTime(), {
                          pattern: scheduler.pattern,
                          tz: scheduler.tz,
                          utc: true,
                      });
                      return next ? new Date(next) : null;
                  }
                : undefined,
        });
    }
    for (const job of [...pending, ...failed]) {
        const data = job.data;
        if (!data?.sid || !subscriptionIds.has(data.sid)) continue;
        const dueAt = data.expectedDueAt
            ? new Date(data.expectedDueAt)
            : new Date(job.timestamp + (job.opts.delay ?? job.delay ?? 0));
        if (!Number.isFinite(dueAt.getTime())) continue;
        const current = schedules.get(data.sid);
        if (failed.includes(job) && current && !current.blocked) continue;
        if (current && current.dueAt <= dueAt) continue;
        schedules.set(data.sid, {
            dueAt,
            cycleCount: data.recurrenceCount ?? current?.cycleCount ?? 1,
            discount: data.discount,
            blocked: failed.includes(job),
        });
    }
    return schedules;
}

export async function upcomingRoutes(app: Elysia) {
    return app.get(
        "/upcoming",
        async (ctx) => {
            const { params, query, status } = ctx;
            const { lid } = params as { lid: string };
            const actor = ctx as typeof ctx & {
                vendorId?: string;
                staffId?: string;
                userId?: string;
            };
            if (
                !(await canAccessLocation(lid, actor.vendorId, actor.staffId))
                    .allowed
            ) {
                return status(403, { error: "Forbidden", code: "FORBIDDEN" });
            }
            const location = await db.query.locations.findFirst({
                where: (row, { eq }) => eq(row.id, lid),
                columns: { id: true, country: true, timezone: true },
                with: {
                    taxRates: true,
                    locationState: { columns: { planId: true } },
                },
            });
            if (!location) return status(404, { error: "Location not found" });
            const now = new Date();
            const window = remainingMonthWindow(now, location.timezone);
            const from = new Date(window.from);
            const until = new Date(window.untilExclusive);
            const [subscriptions, invoices, paid, fees, canMarkPaid] =
                await Promise.all([
                    db.query.memberSubscriptions.findMany({
                        where: and(
                            eq(memberSubscriptions.locationId, lid),
                            isNull(memberSubscriptions.parentId),
                        ),
                        with: {
                            member: {
                                columns: { firstName: true, lastName: true },
                            },
                            pricing: {
                                with: {
                                    plan: {
                                        columns: {
                                            name: true,
                                            locationId: true,
                                        },
                                    },
                                },
                            },
                        },
                    }),
                    db.query.memberInvoices.findMany({
                        where: and(
                            eq(memberInvoices.locationId, lid),
                            isNotNull(memberInvoices.memberPlanId),
                            or(
                                and(
                                    gte(memberInvoices.dueDate, from),
                                    lt(memberInvoices.dueDate, until),
                                ),
                                and(
                                    lt(memberInvoices.forPeriodStart, until),
                                    gte(memberInvoices.forPeriodEnd, from),
                                ),
                            ),
                        ),
                    }),
                    db
                        .select({
                            subscriptionId: memberInvoices.memberPlanId,
                            total: count(),
                        })
                        .from(memberInvoices)
                        .where(
                            and(
                                eq(memberInvoices.locationId, lid),
                                eq(memberInvoices.paid, true),
                                isNotNull(memberInvoices.memberPlanId),
                            ),
                        )
                        .groupBy(memberInvoices.memberPlanId),
                    db.query.additionalFees.findMany({
                        where: (row, { and, eq }) =>
                            and(eq(row.locationId, lid), eq(row.active, true)),
                        orderBy: (row, { asc }) => [
                            asc(row.created),
                            asc(row.id),
                        ],
                    }),
                    canEditLocationMember(lid, actor),
                ]);
            const schedules = subscriptions.some(
                (sub) =>
                    sub.paymentType !== "cash" &&
                    ["active", "trialing", "incomplete"].includes(sub.status),
            )
                ? await loadSchedules(
                      new Set(subscriptions.map((sub) => sub.id)),
                  )
                : new Map<string, UpcomingSchedule>();
            const result = calculateUpcomingPayments({
                subscriptions,
                invoices,
                schedules,
                paidCounts: new Map(
                    paid
                        .filter((row) => row.subscriptionId)
                        .map((row) => [row.subscriptionId!, Number(row.total)]),
                ),
                timezone: location.timezone,
                currency: getCurrency(location.country) as Currency,
                now,
                canMarkPaid,
                quote: (sub, billingPhase, discount) => {
                    if (!sub.pricing)
                        throw new Error("Subscription price is missing");
                    return quoteSubscriptionInvoice({
                        locationId: lid,
                        subscriptionId: sub.id,
                        parentId: sub.parentId,
                        memberPlanPricingId: sub.memberPlanPricingId,
                        promoId: sub.promoId,
                        subscriptionMetadata: sub.metadata,
                        pricing: sub.pricing,
                        location,
                        billingPhase,
                        discount,
                        additionalFees: fees.filter(
                            (fee) =>
                                fee.checkoutTypes.includes("subscription") &&
                                !(
                                    billingPhase === "renewal" &&
                                    fee.initialChargeOnly
                                ),
                        ),
                    });
                },
                options: query,
            });
            if (query.view === "preview") {
                result.manual.rows = [];
                result.automatic.rows = [];
            }
            return result;
        },
        {
            query: t.Object({
                view: t.Optional(
                    t.Union([t.Literal("preview"), t.Literal("schedule")]),
                ),
                collection: t.Optional(
                    t.Union([
                        t.Literal("all"),
                        t.Literal("automatic"),
                        t.Literal("manual"),
                    ]),
                ),
                manualPage: t.Optional(
                    t.Numeric({ minimum: 1, maximum: 100000, multipleOf: 1 }),
                ),
                automaticPage: t.Optional(
                    t.Numeric({ minimum: 1, maximum: 100000, multipleOf: 1 }),
                ),
                pageSize: t.Optional(
                    t.Numeric({ minimum: 1, maximum: 50, multipleOf: 1 }),
                ),
            }),
        },
    );
}
