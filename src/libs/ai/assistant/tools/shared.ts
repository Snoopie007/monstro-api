import { z } from "zod";
import { db } from "@/db/db";
import { sql } from "drizzle-orm";
import type { AssistantChartBlock, AssistantToolName, RememberPreferenceInput } from "@subtrees/types/assistant";

export type ToolExecutorContext = {
  locationId: string;
  vendorId: string;
  userId: string;
  threadId: string;
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  confirmationIntent: "confirm" | "cancel" | null;
};

export type ToolExecutorResult = {
  content: string;
  explicitPreference?: RememberPreferenceInput;
};

export type ToolExecutionTrace = {
  name: AssistantToolName;
  output: Record<string, unknown> | null;
};

export const MAX_TOOL_ITERATIONS = 4;

const assistantChartSeriesSchema = z.object({
  key: z.string().min(1).max(80),
  label: z.string().min(1).max(120),
  color: z.string().min(1).max(60).optional(),
});

const assistantChartDataPointSchema = z.record(z.string(), z.union([z.string(), z.number(), z.null()]));

export const assistantChartBlockSchema = z.object({
  id: z.string().min(1).max(120),
  type: z.literal("chart"),
  version: z.literal(1),
  status: z.enum(["ready", "loading", "invalid"]),
  title: z.string().min(1).max(160),
  subtitle: z.string().max(240).optional(),
  chart: z.object({
    kind: z.enum(["line", "bar", "area"]),
    xKey: z.string().min(1).max(60),
    yFormat: z.enum(["currency", "count", "percent"]),
    series: z.array(assistantChartSeriesSchema).max(4),
    data: z.array(assistantChartDataPointSchema).max(160),
  }).optional(),
  a11y: z.object({
    summary: z.string().max(500).optional(),
    table: z.boolean().optional(),
  }).optional(),
  fallbackText: z.string().min(1).max(500),
});

export function parseRangeDays(input?: string) {
  if (!input) return 30;
  const normalized = input.toLowerCase();
  const numberWords: Record<string, number> = {
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
  const match = normalized.match(/(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(day|days|week|weeks|month|months)/);
  if (!match) return 30;
  const rawValue = match[1] || "";
  const value = /^\d+$/.test(rawValue) ? Number(rawValue) : (numberWords[rawValue] || NaN);
  if (!Number.isFinite(value) || value <= 0) return 30;
  const unit = match[2] || "";
  if (unit.startsWith("week")) return value * 7;
  if (unit.startsWith("month")) return value * 30;
  return value;
}

export function detectConfirmationIntent(message: string): "confirm" | "cancel" | null {
  const lower = message.trim().toLowerCase();
  if (!lower) return null;

  const confirmWords = ["confirm", "yes", "yep", "yeah", "proceed", "go ahead", "do it"];
  const cancelWords = ["cancel", "stop", "no", "nope", "dont", "don't", "abort"];

  if (confirmWords.some((word) => lower === word || lower.includes(` ${word}`) || lower.startsWith(`${word} `))) {
    return "confirm";
  }
  if (cancelWords.some((word) => lower === word || lower.includes(` ${word}`) || lower.startsWith(`${word} `))) {
    return "cancel";
  }

  return null;
}

type LocalDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

export function parseRequestedDateTime(text: string): LocalDateTimeParts | null {
  const normalized = text.replace(/\s+/g, " ").trim();

  const monthMatch = normalized.match(
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:,?\s+(\d{4}))?(?:[^\d]+(\d{1,2})(?::(\d{2}))?\s*(am|pm))?/i,
  );

  if (monthMatch) {
    const monthMap: Record<string, number> = {
      january: 0,
      february: 1,
      march: 2,
      april: 3,
      may: 4,
      june: 5,
      july: 6,
      august: 7,
      september: 8,
      october: 9,
      november: 10,
      december: 11,
    };

    const monthName = monthMatch[1]?.toLowerCase() || "";
    const monthIndex = monthMap[monthName];
    if (typeof monthIndex !== "number") return null;
    const month = monthIndex + 1;
    const day = Number(monthMatch[2]);
    const year = monthMatch[3] ? Number(monthMatch[3]) : new Date().getFullYear();
    let hour = monthMatch[4] ? Number(monthMatch[4]) : 9;
    const minute = monthMatch[5] ? Number(monthMatch[5]) : 0;
    const meridiem = (monthMatch[6] || "am").toLowerCase();

    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

    return { year, month, day, hour, minute };
  }

  const numeric = normalized.match(/(\d{4})-(\d{2})-(\d{2})(?:[ t](\d{1,2})(?::(\d{2}))?)?/i);
  if (numeric) {
    const year = Number(numeric[1]);
    const month = Number(numeric[2]);
    const day = Number(numeric[3]);
    const hour = numeric[4] ? Number(numeric[4]) : 9;
    const minute = numeric[5] ? Number(numeric[5]) : 0;
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return { year, month, day, hour, minute };
  }

  return null;
}

export function formatTimeHHMMSS(parts: { hour: number; minute: number }): string {
  const hh = String(parts.hour).padStart(2, "0");
  const mm = String(parts.minute).padStart(2, "0");
  return `${hh}:${mm}:00`;
}

export function formatHumanDateInTimezone(isoUtc: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(isoUtc));
  } catch {
    return isoUtc;
  }
}

export function buildScheduleContextText(input: Record<string, unknown>, context: ToolExecutorContext): string {
  const inputText = [
    input.details,
    input.dateRange,
    input.query,
    input.memberName,
    input.program,
    input.programName,
    input.time,
    input.date,
  ]
    .filter((value) => typeof value === "string")
    .map((value) => (value as string).trim())
    .filter(Boolean)
    .join(" ");

  const recentUserText = [...context.history]
    .reverse()
    .filter((entry) => entry.role === "user")
    .slice(0, 4)
    .map((entry) => entry.content)
    .reverse()
    .join(" ");

  return [inputText, recentUserText, context.message].filter(Boolean).join(" ").trim();
}

export async function getLocationTimezone(locationId: string): Promise<string> {
  const rows = await db.execute(sql`
    SELECT timezone
    FROM locations
    WHERE id = ${locationId}
    LIMIT 1
  `) as unknown as Array<{ timezone: string | null }>;

  const tz = rows[0]?.timezone?.trim();
  return tz || "UTC";
}

export function preferenceSignalScore(preference: RememberPreferenceInput | null | undefined): number {
  if (!preference) return 0;

  const reasonScore = typeof preference.reason === "string" && preference.reason.trim().length > 0 ? 1 : 0;
  const valueEntries = Object.entries(preference.value || {});
  const valueScore = valueEntries.reduce((score, [_, value]) => {
    if (typeof value === "string") return score + (value.trim().length > 0 ? 2 : 0);
    if (value === null || value === undefined) return score;
    if (typeof value === "object") return score + (Object.keys(value as Record<string, unknown>).length > 0 ? 1 : 0);
    return score + 1;
  }, 0);

  return reasonScore + valueScore;
}

const memberLookupNoiseTokens = new Set([
  "find",
  "member",
  "members",
  "lookup",
  "look",
  "book",
  "booking",
  "class",
  "session",
  "schedule",
  "scheduled",
  "next",
  "this",
  "that",
  "for",
  "to",
  "on",
  "at",
  "please",
  "can",
  "could",
  "would",
  "you",
  "me",
  "a",
  "an",
  "the",
  "and",
  "with",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
  "monday",
  "tuesday",
  "today",
  "tomorrow",
]);

type MemberLookupSignals = {
  raw: string;
  normalized: string;
  searchText: string;
  email: string | null;
  phoneDigits: string | null;
  tokens: string[];
};

function normalizeMemberLookupQuery(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9@._+\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractMemberLookupSignals(rawQuery: string): MemberLookupSignals {
  const raw = rawQuery.trim();
  const normalized = normalizeMemberLookupQuery(raw);
  const emailMatch = normalized.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  const email = emailMatch ? emailMatch[0].toLowerCase() : null;

  const digits = raw.replace(/\D/g, "");
  const phoneDigits = digits.length >= 7 ? digits : null;

  const tokens = normalized
    .split(" ")
    .filter((token) => token.length >= 2 && !memberLookupNoiseTokens.has(token));

  const searchText = email || phoneDigits || tokens.join(" ") || normalized;

  return {
    raw,
    normalized,
    searchText,
    email,
    phoneDigits,
    tokens,
  };
}

function normalizePhoneDigits(input: string | null | undefined): string {
  return (input || "").replace(/\D/g, "");
}

export function scoreMemberCandidate(
  candidate: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone: string | null;
  },
  signals: MemberLookupSignals,
): number {
  const first = (candidate.first_name || "").toLowerCase().trim();
  const last = (candidate.last_name || "").toLowerCase().trim();
  const full = `${first} ${last}`.trim();
  const reverseFull = `${last} ${first}`.trim();
  const email = candidate.email.toLowerCase().trim();
  const phoneDigits = normalizePhoneDigits(candidate.phone);

  let score = 0;

  if (signals.email && email === signals.email) score += 100;
  else if (signals.email && email.includes(signals.email)) score += 65;

  if (signals.phoneDigits && phoneDigits === signals.phoneDigits) score += 90;
  else if (signals.phoneDigits && phoneDigits.includes(signals.phoneDigits)) score += 55;

  if (signals.searchText) {
    if (full === signals.searchText || reverseFull === signals.searchText) score += 80;
    else if (full.startsWith(signals.searchText) || reverseFull.startsWith(signals.searchText)) score += 60;
    else if (full.includes(signals.searchText) || reverseFull.includes(signals.searchText)) score += 35;
  }

  for (const token of signals.tokens) {
    if (first === token || last === token) score += 16;
    else if (first.startsWith(token) || last.startsWith(token)) score += 12;
    else if (first.includes(token) || last.includes(token)) score += 8;

    if (email.includes(token)) score += 6;
    if (phoneDigits.includes(token)) score += 4;
  }

  return score;
}

type TrendReport = {
  metric: string;
  rangeDays: number;
  current: number;
  previous: number;
  direction: "up" | "down" | "flat";
  changePercent: number;
};

type ReportToolResult = TrendReport & {
  chartBlock?: AssistantChartBlock;
};

function buildTrend(current: number, previous: number): { direction: "up" | "down" | "flat"; changePercent: number } {
  if (current === previous) return { direction: "flat", changePercent: 0 };
  if (previous === 0) return { direction: current > 0 ? "up" : "flat", changePercent: current > 0 ? 100 : 0 };
  const raw = ((current - previous) / previous) * 100;
  return {
    direction: raw > 0 ? "up" : "down",
    changePercent: Math.round(raw * 100) / 100,
  };
}

async function fetchLocationReport(locationId: string, metric: string, rangeDays: number): Promise<TrendReport> {
  const metricKey = metric.toLowerCase();

  if (metricKey.includes("revenue")) {
    const revenueRows = await db.execute(sql`
      WITH frames AS (
        SELECT
          now() - (${rangeDays} * interval '1 day') AS curr_start,
          now() AS curr_end,
          now() - (${rangeDays * 2} * interval '1 day') AS prev_start,
          now() - (${rangeDays} * interval '1 day') AS prev_end
      )
      SELECT
        COALESCE(SUM(CASE WHEN t.charge_date >= f.curr_start AND t.charge_date < f.curr_end THEN t.total ELSE 0 END), 0)::bigint AS current_total,
        COALESCE(SUM(CASE WHEN t.charge_date >= f.prev_start AND t.charge_date < f.prev_end THEN t.total ELSE 0 END), 0)::bigint AS previous_total
      FROM frames f
      LEFT JOIN transactions t
        ON t.location_id = ${locationId}
       AND t.type = 'inbound'
       AND t.status = 'paid'
    `) as unknown as Array<{ current_total: number; previous_total: number }>;

    const row = revenueRows[0] || { current_total: 0, previous_total: 0 };
    const current = Math.round((Number(row.current_total || 0) / 100) * 100) / 100;
    const previous = Math.round((Number(row.previous_total || 0) / 100) * 100) / 100;
    const trend = buildTrend(current, previous);
    return {
      metric: "revenue",
      rangeDays,
      current,
      previous,
      direction: trend.direction,
      changePercent: trend.changePercent,
    };
  }

  const activeRows = await db.execute(sql`
    WITH frames AS (
      SELECT
        now() - (${rangeDays} * interval '1 day') AS curr_start,
        now() AS curr_end,
        now() - (${rangeDays * 2} * interval '1 day') AS prev_start,
        now() - (${rangeDays} * interval '1 day') AS prev_end
    )
    SELECT
      COALESCE(COUNT(DISTINCT CASE WHEN c.check_in_time >= f.curr_start AND c.check_in_time < f.curr_end THEN c.member_id END), 0)::bigint AS current_total,
      COALESCE(COUNT(DISTINCT CASE WHEN c.check_in_time >= f.prev_start AND c.check_in_time < f.prev_end THEN c.member_id END), 0)::bigint AS previous_total
    FROM frames f
    LEFT JOIN check_ins c
      ON c.location_id = ${locationId}
  `) as unknown as Array<{ current_total: number; previous_total: number }>;

  const row = activeRows[0] || { current_total: 0, previous_total: 0 };
  const current = Number(row.current_total || 0);
  const previous = Number(row.previous_total || 0);
  const trend = buildTrend(current, previous);
  return {
    metric: "active_members",
    rangeDays,
    current,
    previous,
    direction: trend.direction,
    changePercent: trend.changePercent,
  };
}

function buildInvalidChartBlock(id: string, title: string, fallbackText: string): AssistantChartBlock {
  return {
    id,
    type: "chart",
    version: 1,
    status: "invalid",
    title,
    fallbackText,
  };
}

function sanitizeChartBlock(block: AssistantChartBlock): AssistantChartBlock {
  const parsed = assistantChartBlockSchema.safeParse(block);
  if (parsed.success) return parsed.data as AssistantChartBlock;

  return buildInvalidChartBlock(
    block.id || `chart-invalid-${Date.now()}`,
    block.title || "Chart unavailable",
    block.fallbackText || "I could not render the chart for this report.",
  );
}

export async function fetchReportWithChart(locationId: string, metric: string, rangeDays: number): Promise<ReportToolResult> {
  const report = await fetchLocationReport(locationId, metric, rangeDays);
  const metricKey = report.metric.toLowerCase();
  const blockId = `chart-${metricKey}-${rangeDays}`;

  if (metricKey.includes("revenue")) {
    const rows = await db.execute(sql`
      SELECT
        to_char(date_trunc('day', charge_date), 'YYYY-MM-DD') AS bucket,
        COALESCE(SUM(total), 0)::bigint AS value
      FROM transactions
      WHERE location_id = ${locationId}
        AND type = 'inbound'
        AND status = 'paid'
        AND charge_date >= now() - (${rangeDays} * interval '1 day')
      GROUP BY 1
      ORDER BY 1
      LIMIT 160
    `) as unknown as Array<{ bucket: string; value: number }>;

    const chartBlock = sanitizeChartBlock({
      id: blockId,
      type: "chart",
      version: 1,
      status: "ready",
      title: `Revenue Trend (${rangeDays} days)`,
      subtitle: "Daily paid inbound totals",
      chart: {
        kind: "line",
        xKey: "date",
        yFormat: "currency",
        series: [{ key: "revenue", label: "Revenue", color: "hsl(var(--chart-1))" }],
        data: rows.map((row) => ({
          date: row.bucket,
          revenue: Math.round((Number(row.value || 0) / 100) * 100) / 100,
        })),
      },
      a11y: {
        summary: `Revenue is ${report.direction} by ${report.changePercent}% versus the previous period.`,
        table: true,
      },
      fallbackText: `Revenue summary: ${report.current} current, ${report.previous} previous (${report.changePercent}% ${report.direction}).`,
    });

    return {
      ...report,
      chartBlock,
    };
  }

  if (metricKey.includes("attendance")) {
    const rows = await db.execute(sql`
      SELECT
        to_char(date_trunc('day', check_in_time), 'YYYY-MM-DD') AS bucket,
        COALESCE(COUNT(DISTINCT member_id), 0)::bigint AS value
      FROM check_ins
      WHERE location_id = ${locationId}
        AND check_in_time >= now() - (${rangeDays} * interval '1 day')
      GROUP BY 1
      ORDER BY 1
      LIMIT 160
    `) as unknown as Array<{ bucket: string; value: number }>;

    const chartBlock = sanitizeChartBlock({
      id: blockId,
      type: "chart",
      version: 1,
      status: "ready",
      title: `Attendance Trend (${rangeDays} days)`,
      subtitle: "Distinct member check-ins per day",
      chart: {
        kind: "bar",
        xKey: "date",
        yFormat: "count",
        series: [{ key: "attendance", label: "Attendance", color: "hsl(var(--chart-2))" }],
        data: rows.map((row) => ({ date: row.bucket, attendance: Number(row.value || 0) })),
      },
      a11y: {
        summary: `Attendance is ${report.direction} by ${report.changePercent}% versus the previous period.`,
        table: true,
      },
      fallbackText: `Attendance summary: ${report.current} current, ${report.previous} previous (${report.changePercent}% ${report.direction}).`,
    });

    return {
      ...report,
      chartBlock,
    };
  }

  const chartBlock = sanitizeChartBlock({
    id: blockId,
    type: "chart",
    version: 1,
    status: "ready",
    title: `Active Members Comparison (${rangeDays} days)`,
    subtitle: "Current vs previous period",
    chart: {
      kind: "bar",
      xKey: "period",
      yFormat: "count",
      series: [{ key: "value", label: "Members", color: "hsl(var(--chart-3))" }],
      data: [
        { period: "Previous", value: report.previous },
        { period: "Current", value: report.current },
      ],
    },
    a11y: {
      summary: `Active members are ${report.direction} by ${report.changePercent}% versus the previous period.`,
      table: true,
    },
    fallbackText: `Active members summary: ${report.current} current, ${report.previous} previous (${report.changePercent}% ${report.direction}).`,
  });

  return {
    ...report,
    chartBlock,
  };
}

