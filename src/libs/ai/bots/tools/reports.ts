import { db } from "@/db/db";
import { memberPlanPricing, memberSubscriptions } from "@/subtrees/schemas";
import type {
    ActiveMembersReport,
    MRRReport,
    MonthlyRevenueReport,
    ReportKind,
    ReportToolResult,
    ReportWindow,
    TopPayersReport,
} from "@/subtrees/types/bots";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { ToolArgs, ToolExecutorResult } from "../type";
import { asString, jsonResult } from "../utils";

const TOP_PAYER_LIMIT = 5;
const REPORT_KINDS: ReportKind[] = ["active_members", "monthly_revenue", "mrr", "top_payers"];

type RangeSpec =
    | { mode: "this_month" | "last_month" | "this_year" | "last_year"; label: string }
    | { mode: "last_months"; count: number; label: string }
    | { mode: "last_days"; count: number; label: string };

const NUMBER_WORDS: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
};

function reportResult(result: ReportToolResult): ToolExecutorResult {
    return { content: jsonResult(result as unknown as Record<string, unknown>) };
}

function normalizeKind(value: string): ReportKind | null {
    return REPORT_KINDS.find((kind) => kind === value) ?? null;
}

function dollars(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
}

function countFrom(raw: string): number {
    const parsed = /^\d+$/.test(raw) ? Number(raw) : NUMBER_WORDS[raw];
    return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : NaN;
}

function parseReportRange(input: string): RangeSpec | null {
    const text = input.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
    if (!text || text === "this month" || text === "current month") {
        return { mode: "this_month", label: "This month" };
    }
    if (text === "last month" || text === "previous month") {
        return { mode: "last_month", label: "Last month" };
    }
    if (text === "this year" || text === "year to date" || text === "ytd") {
        return { mode: "this_year", label: "This year" };
    }
    if (text === "last year" || text === "previous year") {
        return { mode: "last_year", label: "Last year" };
    }

    const match = text.match(/^(?:last|past|previous)?\s*(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(day|week|month|year)s?$/);
    if (!match) return null;
    const value = countFrom(match[1] || "");
    const unit = match[2] || "";
    if (!Number.isFinite(value) || value <= 0) return null;

    if (unit.startsWith("day")) {
        const count = Math.min(366, value);
        return { mode: "last_days", count, label: `Last ${count} day${count === 1 ? "" : "s"}` };
    }
    if (unit.startsWith("week")) {
        const count = Math.min(366, value * 7);
        return { mode: "last_days", count, label: `Last ${count} days` };
    }
    if (unit.startsWith("year")) {
        const count = Math.min(36, value * 12);
        return { mode: "last_months", count, label: `Last ${count} months` };
    }
    const count = Math.min(36, value);
    return { mode: "last_months", count, label: `Last ${count} month${count === 1 ? "" : "s"}` };
}

function bucketFor(spec: RangeSpec): ReportWindow["bucket"] {
    if (spec.mode === "this_month" || spec.mode === "last_month" || spec.mode === "last_days") return "day";
    return "month";
}

function monthlyCents(price: number, interval: string | null, threshold: number | null) {
    const every = threshold && threshold > 0 ? threshold : 1;
    const amount = Number(price) || 0;
    if (interval === "day") return Math.round((amount * 30) / every);
    if (interval === "week") return Math.round((amount * 52) / (12 * every));
    if (interval === "year") return Math.round(amount / (12 * every));
    return Math.round(amount / every);
}

async function locationTimezone(locationId: string) {
    const location = await db.query.locations.findFirst({
        where: (row, { eq: whereEq }) => whereEq(row.id, locationId),
        columns: { timezone: true },
    });
    return location?.timezone || "UTC";
}

async function resolveWindow(locationId: string, spec: RangeSpec): Promise<{ timezone: string; window: ReportWindow }> {
    const timezone = await locationTimezone(locationId);
    const monthsBack = spec.mode === "last_months" ? spec.count - 1 : 0;
    const daysBack = spec.mode === "last_days" ? spec.count - 1 : 0;
    const rows = await db.execute(sql`
        WITH now_local AS (
            SELECT timezone(${timezone}, now()) AS local_now
        )
        SELECT
            to_char(local_start, 'YYYY-MM-DD') AS start_date,
            to_char(local_end, 'YYYY-MM-DD') AS end_date
        FROM (
            SELECT
                CASE
                    WHEN ${spec.mode} = 'this_month' THEN date_trunc('month', local_now)
                    WHEN ${spec.mode} = 'last_month' THEN date_trunc('month', local_now) - interval '1 month'
                    WHEN ${spec.mode} = 'this_year' THEN date_trunc('year', local_now)
                    WHEN ${spec.mode} = 'last_year' THEN date_trunc('year', local_now) - interval '1 year'
                    WHEN ${spec.mode} = 'last_months' THEN date_trunc('month', local_now) - (${monthsBack} * interval '1 month')
                    ELSE date_trunc('day', local_now) - (${daysBack} * interval '1 day')
                END AS local_start,
                CASE
                    WHEN ${spec.mode} = 'last_month' THEN date_trunc('month', local_now)
                    WHEN ${spec.mode} = 'last_year' THEN date_trunc('year', local_now)
                    WHEN ${spec.mode} = 'this_year' THEN date_trunc('year', local_now) + interval '1 year'
                    WHEN ${spec.mode} = 'last_days' THEN date_trunc('day', local_now) + interval '1 day'
                    ELSE date_trunc('month', local_now) + interval '1 month'
                END AS local_end
            FROM now_local
        ) bounds
    `) as unknown as Array<{ start_date: string; end_date: string }>;

    const row = rows[0];
    return {
        timezone,
        window: {
            label: spec.label,
            start: row?.start_date ?? "",
            end: row?.end_date ?? "",
            bucket: bucketFor(spec),
        },
    };
}

async function activeMembers(locationId: string): Promise<ActiveMembersReport> {
    const rows = await db.execute(sql`
        SELECT
            (
                SELECT COUNT(*)::int
                FROM member_subscriptions
                WHERE location_id = ${locationId}
                  AND status = 'active'
            ) AS active_subscriptions,
            (
                SELECT COUNT(*)::int
                FROM member_packages
                WHERE location_id = ${locationId}
                  AND status = 'active'
            ) AS active_packages,
            (
                SELECT COUNT(DISTINCT member_id)::int
                FROM (
                    SELECT member_id
                    FROM member_subscriptions
                    WHERE location_id = ${locationId}
                      AND status = 'active'
                    UNION
                    SELECT member_id
                    FROM member_packages
                    WHERE location_id = ${locationId}
                      AND status = 'active'
                ) members
            ) AS active_member_count
    `) as unknown as Array<{
        active_subscriptions: number;
        active_packages: number;
        active_member_count: number;
    }>;

    const row = rows[0];
    const activeSubscriptions = Number(row?.active_subscriptions ?? 0);
    const activePackages = Number(row?.active_packages ?? 0);
    const activeMemberCount = Number(row?.active_member_count ?? 0);
    return {
        ok: true,
        kind: "active_members",
        summary: `${activeMemberCount} active members (${activeSubscriptions} subscriptions, ${activePackages} packages).`,
        activeMemberCount,
        activeSubscriptions,
        activePackages,
        block: {
            type: "metric",
            label: "Active members",
            value: activeMemberCount,
            unit: "count",
        },
    };
}

async function monthlyRevenue(locationId: string, spec: RangeSpec): Promise<MonthlyRevenueReport> {
    const { timezone, window } = await resolveWindow(locationId, spec);
    const rows = window.bucket === "day"
        ? await db.execute(sql`
            SELECT
                to_char(d.day, 'YYYY-MM-DD') AS date,
                COALESCE(SUM(GREATEST(t.total - t.refunded_amount, 0)), 0)::int AS total_cents
            FROM generate_series(${window.start}::date, (${window.end}::date - interval '1 day')::date, interval '1 day') AS d(day)
            LEFT JOIN transactions t
                ON t.location_id = ${locationId}
               AND t.type = 'inbound'
               AND t.status = 'paid'
               AND (t.charge_date AT TIME ZONE ${timezone})::date = d.day::date
            GROUP BY d.day
            ORDER BY d.day
        `) as unknown as Array<{ date: string; total_cents: number }>
        : await db.execute(sql`
            SELECT
                to_char(d.bucket, 'YYYY-MM') AS date,
                COALESCE(SUM(GREATEST(t.total - t.refunded_amount, 0)), 0)::int AS total_cents
            FROM generate_series(
                date_trunc('month', ${window.start}::date),
                (${window.end}::date - interval '1 day'),
                interval '1 month'
            ) AS d(bucket)
            LEFT JOIN transactions t
                ON t.location_id = ${locationId}
               AND t.type = 'inbound'
               AND t.status = 'paid'
               AND date_trunc('month', t.charge_date AT TIME ZONE ${timezone}) = d.bucket
            GROUP BY d.bucket
            ORDER BY d.bucket
        `) as unknown as Array<{ date: string; total_cents: number }>;

    const points = rows.map((row) => ({
        date: row.date,
        totalCents: Number(row.total_cents ?? 0),
    }));
    const totalCents = points.reduce((sum, point) => sum + point.totalCents, 0);
    return {
        ok: true,
        kind: "monthly_revenue",
        range: window,
        summary: `Revenue for ${window.label.toLowerCase()} is ${dollars(totalCents)}.`,
        block: {
            type: "chart",
            label: window.label,
            unit: "cents",
            totalCents,
            points,
        },
    };
}

async function topPayers(locationId: string, spec: RangeSpec): Promise<TopPayersReport> {
    const { timezone, window } = await resolveWindow(locationId, spec);
    const rows = await db.execute(sql`
        SELECT
            m.id AS member_id,
            btrim(concat_ws(' ', m.first_name, m.last_name)) AS name,
            COALESCE(SUM(GREATEST(t.total - t.refunded_amount, 0)), 0)::int AS total_cents
        FROM transactions t
        INNER JOIN members m ON m.id = t.member_id
        WHERE t.location_id = ${locationId}
          AND t.type = 'inbound'
          AND t.status = 'paid'
          AND (t.charge_date AT TIME ZONE ${timezone}) >= ${window.start}::date
          AND (t.charge_date AT TIME ZONE ${timezone}) < ${window.end}::date
        GROUP BY m.id, m.first_name, m.last_name
        ORDER BY total_cents DESC, name ASC
        LIMIT ${TOP_PAYER_LIMIT}
    `) as unknown as Array<{ member_id: string; name: string; total_cents: number }>;

    const ranked = rows.map((row) => ({
        memberId: row.member_id,
        name: row.name || "Member",
        totalCents: Number(row.total_cents ?? 0),
    }));
    const summary = ranked.length === 0
        ? `No paid transactions for ${window.label.toLowerCase()}.`
        : `Top paying members for ${window.label.toLowerCase()}: ${ranked.map((row) => `${row.name} ${dollars(row.totalCents)}`).join(", ")}.`;
    return {
        ok: true,
        kind: "top_payers",
        range: window,
        summary,
        block: {
            type: "list",
            label: window.label,
            rows: ranked,
        },
    };
}

async function mrr(locationId: string): Promise<MRRReport> {
    const rows = await db
        .select({
            price: memberPlanPricing.price,
            interval: memberPlanPricing.interval,
            intervalThreshold: memberPlanPricing.intervalThreshold,
        })
        .from(memberSubscriptions)
        .innerJoin(memberPlanPricing, eq(memberSubscriptions.memberPlanPricingId, memberPlanPricing.id))
        .where(and(
            eq(memberSubscriptions.locationId, locationId),
            eq(memberSubscriptions.status, "active"),
            isNull(memberSubscriptions.parentId),
            sql`(${memberSubscriptions.metadata}->'deferredBilling' IS NULL OR ${memberSubscriptions.currentPeriodStart} >= (${memberSubscriptions.metadata}->'deferredBilling'->>'firstPaymentAt')::timestamptz)`,
        ));

    const totalMrrCents = rows.reduce(
        (sum, row) => sum + monthlyCents(row.price, row.interval, row.intervalThreshold),
        0,
    );
    const activeSubscriptions = rows.length;
    const averageMrrCents = activeSubscriptions > 0 ? Math.round(totalMrrCents / activeSubscriptions) : 0;
    return {
        ok: true,
        kind: "average_mrr",
        summary: `Average MRR is ${dollars(averageMrrCents)} across ${activeSubscriptions} subscriptions.`,
        activeSubscriptions,
        totalMrrCents,
        averageMrrCents,
        block: {
            type: "metric",
            label: "Average MRR",
            value: averageMrrCents,
            unit: "cents",
        },
    };
}

export async function executeReportTool(args: ToolArgs, locationId: string): Promise<ToolExecutorResult> {
    const kind = normalizeKind(asString(args.kind));
    if (!kind) {
        return reportResult({
            ok: false,
            error: "Pass kind as active_members, monthly_revenue, average_mrr, or top_payers.",
        });
    }

    try {
        if (kind === "active_members") return reportResult(await activeMembers(locationId));
        if (kind === "mrr") return reportResult(await mrr(locationId));

        const rangeText = asString(args.range);
        const spec = parseReportRange(rangeText);
        if (!spec) {
            return reportResult({
                ok: false,
                error: "Pass range as this month, last month, this year, last year, or last N days, weeks, or months.",
            });
        }
        if (kind === "top_payers") return reportResult(await topPayers(locationId, spec));
        return reportResult(await monthlyRevenue(locationId, spec));
    } catch (error) {
        console.error(error);
        return reportResult({ ok: false, error: "Could not load that report." });
    }
}
