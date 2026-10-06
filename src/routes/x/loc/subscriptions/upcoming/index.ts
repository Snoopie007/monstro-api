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
import { quoteSubscriptionInvoice } from "../../invoices/subscriptionQuote";
import {
    calculateUpcomingPayments,
    remainingMonthWindow,
    type UpcomingSchedule,
    type UpcomingSubscription,
} from "./payments";

type ScheduleSubscription = Pick<UpcomingSubscription,
    "id" | "locationId" | "parentId" | "paymentType" | "status" | "startDate" | "trialEnd" | "currentPeriodEnd"
>;

export async function loadSchedules(subscriptions: ScheduleSubscription[], locationId: string) {
    const schedules = new Map<string, UpcomingSchedule>();
    const eligible = subscriptions.filter(sub => sub.locationId === locationId && !sub.parentId
        && sub.paymentType !== "cash" && ["active", "trialing", "incomplete"].includes(sub.status));
    for (let offset = 0; offset < eligible.length; offset += 10) {
        await Promise.all(eligible.slice(offset, offset + 10).map(async sub => {
            const due = sub.status === "trialing" && sub.trialEnd ? sub.trialEnd
                : sub.status === "incomplete" ? sub.startDate : sub.currentPeriodEnd;
            const jobIds = [`renewal:recursive:${sub.id}`];
            if (due && Number.isFinite(due.getTime())) {
                const exactId = `renewal-exact-${sub.id}-${due.getTime()}`;
                jobIds.push(exactId, `${exactId}-recovery`);
            }
            const [scheduler, jobs] = await Promise.all([
                subQueue.getJobScheduler(`renewal:static:${sub.id}`),
                Promise.all(jobIds.map(id => subQueue.getJob(id))),
            ]);
            let current: UpcomingSchedule | undefined;
            const data = scheduler?.template?.data;
            if (data?.sid === sub.id && data.lid === locationId && scheduler?.next && Number.isFinite(scheduler.next)) {
                current = {
                    dueAt: new Date(scheduler.next),
                    cycleCount: (scheduler.iterationCount ?? 0) + 1,
                    discount: data.discount,
                    nextDueAt: scheduler.pattern ? after => {
                        const next = defaultRepeatStrategy(after.getTime(), {
                            pattern: scheduler.pattern, tz: scheduler.tz, utc: true,
                        });
                        return next ? new Date(next) : null;
                    } : undefined,
                };
            }
            const candidates = await Promise.all(jobs.map(async job => {
                if (!job || job.data?.sid !== sub.id || job.data.lid !== locationId) return null;
                if (job.data.expectedDueAt && (!due || new Date(job.data.expectedDueAt).getTime() !== due.getTime())) return null;
                const state = await job.getState();
                if (!["delayed", "waiting", "active", "prioritized", "failed"].includes(state)) return null;
                const dueAt = job.data.expectedDueAt ? new Date(job.data.expectedDueAt)
                    : new Date(job.timestamp + (job.opts.delay ?? job.delay ?? 0));
                if (!Number.isFinite(dueAt.getTime())) return null;
                return { dueAt, cycleCount: job.data.recurrenceCount ?? current?.cycleCount ?? 1,
                    discount: job.data.discount, blocked: state === "failed" };
            }));
            // A retained failed attempt must not hide its live recovery job.
            for (const candidate of candidates.filter(candidate => candidate !== null)
                .sort((a, b) => Number(a.blocked) - Number(b.blocked) || a.dueAt.getTime() - b.dueAt.getTime())) {
                if (current && ((!current.blocked && candidate.blocked) || current.dueAt <= candidate.dueAt)) continue;
                current = candidate;
            }
            if (current) schedules.set(sub.id, current);
        }));
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
            const schedules = await loadSchedules(subscriptions, lid);
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
                quote: (sub, billingPhase, discount, periodStart) => {
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
                        periodStart,
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
