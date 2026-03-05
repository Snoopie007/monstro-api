import { z } from "zod";
import { assistantMemoryWritebackQueue } from "@/queues";
import { ChatOpenAI } from "@langchain/openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { db } from "@/db/db";
import { sql } from "drizzle-orm";

export const assistantToolNames = [
  "schedule_manage",
  "member_lookup",
  "location_reports",
  "remember_preference",
] as const;

export type AssistantToolName = (typeof assistantToolNames)[number];

export const rememberPreferenceInputSchema = z.object({
  preferenceType: z.enum([
    "report_format",
    "default_date_range",
    "scheduling_policy",
    "timezone",
    "custom",
  ]),
  value: z.record(z.string(), z.unknown()),
  reason: z.string().trim().max(500).optional(),
});

export type RememberPreferenceInput = z.infer<typeof rememberPreferenceInputSchema>;

export const assistantChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  threadId: z.string().trim().min(1).max(120).optional(),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(4000),
  })).max(20).optional(),
});

export type AssistantChatRequest = z.infer<typeof assistantChatRequestSchema>;

export type AssistantToolCall = {
  name: AssistantToolName;
  input: Record<string, unknown>;
};

export type AssistantResponseState = "answer" | "ask_clarification" | "confirm_action" | "handoff";

export type AssistantPromptKind = "text" | "choice" | "confirm";

export type AssistantPromptOption = {
  label: string;
  value: string;
};

export type AssistantPrompt = {
  id: string;
  kind: AssistantPromptKind;
  question: string;
  required: boolean;
  risk: "low" | "high";
  blocking: boolean;
  responseChannel: "chatbox" | "inline";
  options?: AssistantPromptOption[];
  placeholder?: string;
};

export type AssistantBookingMeta = {
  reservationId: string | null;
  startOnUtc: string;
  locationTimezone: string;
  startOnLocation: string;
};

export type AssistantChartKind = "line" | "bar" | "area";

export type AssistantChartSeries = {
  key: string;
  label: string;
  color?: string;
};

export type AssistantChartBlock = {
  id: string;
  type: "chart";
  version: 1;
  status: "ready" | "loading" | "invalid";
  title: string;
  subtitle?: string;
  chart?: {
    kind: AssistantChartKind;
    xKey: string;
    yFormat: "currency" | "count" | "percent";
    series: AssistantChartSeries[];
    data: Array<Record<string, string | number | null>>;
  };
  a11y?: {
    summary?: string;
    table?: boolean;
  };
  fallbackText: string;
};

export type AssistantBlock = AssistantChartBlock;

export type AssistantChatResult = {
  threadId: string;
  reply: string;
  usedTools: AssistantToolCall[];
  memorySaved: boolean;
  bookingMeta?: AssistantBookingMeta;
  blocks?: AssistantBlock[];
  responseState?: AssistantResponseState;
  prompts?: AssistantPrompt[];
  inputMode?: "free_text" | "prompt_only";
  promptPolicy?: {
    allowMultiple: boolean;
    maxPromptsThisTurn: number;
  };
};

export const assistantMemoryWritebackJobSchema = z.object({
  locationId: z.string().min(1),
  vendorId: z.string().min(1),
  userId: z.string().min(1),
  threadId: z.string().min(1),
  userMessage: z.string().min(1),
  assistantReply: z.string().min(1),
  toolCalls: z.array(
    z.object({
      name: z.enum(assistantToolNames),
      input: z.record(z.string(), z.unknown()),
    }),
  ),
  explicitPreference: rememberPreferenceInputSchema.optional(),
  createdAt: z.string(),
});

export type AssistantMemoryWritebackJob = z.infer<typeof assistantMemoryWritebackJobSchema>;

const assistantChartSeriesSchema = z.object({
  key: z.string().min(1).max(80),
  label: z.string().min(1).max(120),
  color: z.string().min(1).max(60).optional(),
});

const assistantChartDataPointSchema = z.record(z.string(), z.union([z.string(), z.number(), z.null()]));

const assistantChartBlockSchema = z.object({
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

type RunAssistantTurnProps = {
  locationId: string;
  vendorId: string;
  userId: string;
  message: string;
  threadId?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
};

type RecalledMemory = {
  id: string;
  content: string;
  score: number;
};

type ToolExecutorContext = {
  locationId: string;
  vendorId: string;
  userId: string;
  threadId: string;
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  confirmationIntent: "confirm" | "cancel" | null;
};

type ToolExecutorResult = {
  content: string;
  explicitPreference?: RememberPreferenceInput;
};

type ToolExecutionTrace = {
  name: AssistantToolName;
  output: Record<string, unknown> | null;
};

const MAX_TOOL_ITERATIONS = 4;

function parseRangeDays(input?: string) {
  if (!input) return 30;
  const normalized = input.toLowerCase();
  const match = normalized.match(/(\d{1,3})\s*(day|days|week|weeks|month|months)/);
  if (!match) return 30;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return 30;
  const unit = match[2] || "";
  if (unit.startsWith("week")) return value * 7;
  if (unit.startsWith("month")) return value * 30;
  return value;
}

function detectConfirmationIntent(message: string): "confirm" | "cancel" | null {
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

function parseRequestedDateTime(text: string): LocalDateTimeParts | null {
  const normalized = text.replace(/\s+/g, " ").trim();

  const monthMatch = normalized.match(
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})(?:[^\d]+(\d{1,2})(?::(\d{2}))?\s*(am|pm))?/i,
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
    const year = Number(monthMatch[3]);
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

function formatTimeHHMMSS(parts: { hour: number; minute: number }): string {
  const hh = String(parts.hour).padStart(2, "0");
  const mm = String(parts.minute).padStart(2, "0");
  return `${hh}:${mm}:00`;
}

function formatHumanDateInTimezone(isoUtc: string, timezone: string): string {
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

function buildScheduleContextText(input: Record<string, unknown>, context: ToolExecutorContext): string {
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

async function getLocationTimezone(locationId: string): Promise<string> {
  const rows = await db.execute(sql`
    SELECT timezone
    FROM locations
    WHERE id = ${locationId}
    LIMIT 1
  `) as unknown as Array<{ timezone: string | null }>;

  const tz = rows[0]?.timezone?.trim();
  return tz || "UTC";
}

async function buildEmbeddingVector(text: string): Promise<number[] | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  const embeddings = new OpenAIEmbeddings({
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.ASSISTANT_EMBEDDING_MODEL || "text-embedding-3-small",
  });

  const vector = await embeddings.embedQuery(text);
  if (!Array.isArray(vector) || vector.length === 0) return null;
  return vector;
}

function toVectorLiteral(values: number[]) {
  return `[${values.join(",")}]`;
}

function preferenceSignalScore(preference: RememberPreferenceInput | null | undefined): number {
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

function extractMemberLookupSignals(rawQuery: string): MemberLookupSignals {
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

function scoreMemberCandidate(
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
    const current = Number(row.current_total || 0);
    const previous = Number(row.previous_total || 0);
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

async function fetchReportWithChart(locationId: string, metric: string, rangeDays: number): Promise<ReportToolResult> {
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
        data: rows.map((row) => ({ date: row.bucket, revenue: Number(row.value || 0) })),
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

function toFunctionTool(name: AssistantToolName, description: string, schema: Record<string, unknown>) {
  return {
    type: "function" as const,
    function: {
      name,
      description,
      parameters: schema,
    },
  };
}

const toolDefinitions = [
  toFunctionTool(
    "schedule_manage",
    "Use for creating, updating, cancelling, or checking schedules for the current location.",
    {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["create", "update", "cancel", "check"],
          description: "Scheduling intent action",
        },
        dateRange: {
          type: "string",
          description: "Date range context, for example next week or 2026-03-01 to 2026-03-07",
        },
        details: {
          type: "string",
          description: "Additional scheduling details",
        },
      },
      required: ["action"],
    },
  ),
  toFunctionTool(
    "member_lookup",
    "Use to fetch member information for this location by name, email, or phone.",
    {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Member identifier such as name, email, or phone",
        },
      },
      required: ["query"],
    },
  ),
  toFunctionTool(
    "location_reports",
    "Use to fetch location KPIs and reporting metrics for a given time range.",
    {
      type: "object",
      properties: {
        metric: {
          type: "string",
          description: "Metric name such as attendance, revenue, active_members",
        },
        range: {
          type: "string",
          description: "Time range for report retrieval, for example last 30 days",
        },
      },
      required: ["metric", "range"],
    },
  ),
  toFunctionTool(
    "remember_preference",
    "Use only when the vendor explicitly asks to remember a preference.",
    {
      type: "object",
      properties: {
        preferenceType: {
          type: "string",
          enum: ["report_format", "default_date_range", "scheduling_policy", "timezone", "custom"],
        },
        value: {
          type: "object",
          additionalProperties: true,
          description: "Structured preference value",
        },
        reason: {
          type: "string",
        },
      },
      required: ["preferenceType", "value"],
    },
  ),
];

function parseToolInput(input: unknown): Record<string, unknown> {
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      return typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
}

function toTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item === "object" && item !== null && "text" in item) {
          const text = (item as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .join(" ")
      .trim();
  }
  return "";
}

async function executeToolCall(
  name: AssistantToolName,
  input: Record<string, unknown>,
  context: ToolExecutorContext,
): Promise<ToolExecutorResult> {
  if (name === "remember_preference") {
    const normalizedInput: Record<string, unknown> = {
      preferenceType:
        typeof input.preferenceType === "string"
          ? input.preferenceType
          : "custom",
      value:
        typeof input.value === "object" && input.value !== null
          ? input.value
          : {
              note:
                typeof input.value === "string"
                  ? input.value
                  : typeof input.note === "string"
                    ? input.note
                    : "",
            },
      reason:
        typeof input.reason === "string"
          ? input.reason
          : "Explicit vendor preference",
    };

    const parsed = rememberPreferenceInputSchema.safeParse(normalizedInput);
    if (!parsed.success) {
      return {
        content: JSON.stringify({ ok: false, error: "Invalid remember_preference payload" }),
      };
    }

    return {
      content: JSON.stringify({ ok: true, saved: true, locationId: context.locationId }),
      explicitPreference: parsed.data,
    };
  }

  if (name === "schedule_manage") {
    const action = typeof input.action === "string" ? input.action.toLowerCase() : "check";
    const rangeText = typeof input.dateRange === "string"
      ? input.dateRange
      : (typeof input.range === "string" ? input.range : "next 14 days");
    const days = parseRangeDays(rangeText);

    if (action !== "check" && context.confirmationIntent === "cancel") {
      return {
        content: JSON.stringify({
          ok: true,
          locationId: context.locationId,
          tool: name,
          action,
          status: "cancelled_by_user",
          message: "Scheduling request cancelled.",
        }),
      };
    }

    if (action !== "check" && context.confirmationIntent !== "confirm") {
      return {
        content: JSON.stringify({
          ok: true,
          locationId: context.locationId,
          tool: name,
          action,
          status: "requires_confirmation",
          message: "Mutation actions are staged. Ask user to confirm exact schedule details before execution.",
          input,
        }),
      };
    }

    if (action === "create") {
      const scheduleText = buildScheduleContextText(input, context);
      const requestedDate = parseRequestedDateTime(scheduleText);
      const locationTimezone = await getLocationTimezone(context.locationId);

      if (!requestedDate) {
        return {
          content: JSON.stringify({
            ok: false,
            locationId: context.locationId,
            tool: name,
            action,
            status: "needs_details",
            message: "I could not parse the requested booking date/time. Please provide it in a format like March 11, 2026 at 3 PM.",
          }),
        };
      }

      const dateText = `${requestedDate.year}-${String(requestedDate.month).padStart(2, "0")}-${String(requestedDate.day).padStart(2, "0")}`;
      const requestedTime = formatTimeHHMMSS(requestedDate);
      const requestedLocalTimestamp = `${dateText} ${requestedTime}`;
      const timingRows = await db.execute(sql`
        SELECT
          (${requestedLocalTimestamp}::timestamp AT TIME ZONE ${locationTimezone})::timestamptz AS start_utc,
          EXTRACT(DOW FROM ${requestedLocalTimestamp}::timestamp)::int AS local_dow,
          TO_CHAR(${requestedLocalTimestamp}::timestamp, 'HH24:MI:SS') AS local_time
      `) as unknown as Array<{ start_utc: string; local_dow: number; local_time: string }>;

      const timing = timingRows[0];
      if (!timing?.start_utc) {
        return {
          content: JSON.stringify({
            ok: false,
            locationId: context.locationId,
            tool: name,
            action,
            status: "needs_details",
            message: "I could not parse the requested date/time in this location timezone. Please provide the schedule details again.",
          }),
        };
      }

      const memberSignals = extractMemberLookupSignals(scheduleText);
      if (!memberSignals.searchText) {
        return {
          content: JSON.stringify({
            ok: false,
            locationId: context.locationId,
            tool: name,
            action,
            status: "needs_details",
            message: "I could not identify the member to book. Please provide the member full name or email.",
          }),
        };
      }

      const memberLike = `%${memberSignals.searchText}%`;
      const memberEmailLike = memberSignals.email ? `%${memberSignals.email}%` : null;
      const memberPhoneLike = memberSignals.phoneDigits ? `%${memberSignals.phoneDigits}%` : null;
      const memberTokenLikes = memberSignals.tokens.map((token) => `%${token}%`);
      const memberEmailCondition = memberEmailLike ? sql`m.email ILIKE ${memberEmailLike}` : sql`false`;
      const memberPhoneCondition = memberPhoneLike
        ? sql`regexp_replace(COALESCE(m.phone, ''), '\\D', '', 'g') LIKE ${memberPhoneLike}`
        : sql`false`;

      const memberRows = await db.execute(sql`
        SELECT m.id, m.first_name, m.last_name, m.email, m.phone
        FROM member_locations ml
        JOIN members m ON m.id = ml.member_id
        WHERE ml.location_id = ${context.locationId}
          AND (
            concat_ws(' ', COALESCE(m.first_name, ''), COALESCE(m.last_name, '')) ILIKE ${memberLike}
            OR concat_ws(' ', COALESCE(m.last_name, ''), COALESCE(m.first_name, '')) ILIKE ${memberLike}
            OR m.email ILIKE ${memberLike}
            OR COALESCE(m.phone, '') ILIKE ${memberLike}
            OR (${memberEmailCondition})
            OR (${memberPhoneCondition})
            OR (${memberTokenLikes.length > 0 ? sql.join(memberTokenLikes.map((tokenLike) => sql`
                m.first_name ILIKE ${tokenLike}
                OR m.last_name ILIKE ${tokenLike}
                OR m.email ILIKE ${tokenLike}
                OR COALESCE(m.phone, '') ILIKE ${tokenLike}
              `), sql` OR `) : sql`false`})
          )
        ORDER BY m.created_at DESC
        LIMIT 30
      `) as unknown as Array<{
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string;
        phone: string | null;
      }>;

      const scoredMembers = memberRows
        .map((memberRow) => ({
          ...memberRow,
          score: scoreMemberCandidate(memberRow, memberSignals),
        }))
        .filter((memberRow) => memberRow.score > 0)
        .sort((a, b) => b.score - a.score);

      const member = scoredMembers[0];
      if (!member) {
        return {
          content: JSON.stringify({
            ok: false,
            locationId: context.locationId,
            tool: name,
            action,
            status: "needs_details",
            message: "I could not identify the member to book. Please provide the member full name or email.",
          }),
        };
      }

      const programRows = await db.execute(sql`
        SELECT id, name
        FROM programs
        WHERE location_id = ${context.locationId}
        ORDER BY length(name) DESC, created_at DESC
      `) as unknown as Array<{ id: string; name: string }>;

      const lowerText = scheduleText.toLowerCase();
      const program = programRows.find((row) => lowerText.includes(row.name.toLowerCase()));
      if (!program) {
        return {
          content: JSON.stringify({
            ok: false,
            locationId: context.locationId,
            tool: name,
            action,
            status: "needs_details",
            message: "I could not identify the program/session name. Please include the exact class name.",
          }),
        };
      }

      const requestedDay = Number(timing.local_dow);
      const sessionRows = await db.execute(sql`
        SELECT id, day, time, duration
        FROM program_sessions
        WHERE program_id = ${program.id}
          AND day = ${requestedDay}
          AND time = ${timing.local_time}::time
        LIMIT 1
      `) as unknown as Array<{ id: string; day: number; time: string; duration: number }>;

      const session = sessionRows[0];
      if (!session) {
        const alternatives = await db.execute(sql`
          SELECT day, time, duration
          FROM program_sessions
          WHERE program_id = ${program.id}
          ORDER BY day, time
          LIMIT 5
        `) as unknown as Array<{ day: number; time: string; duration: number }>;

        return {
          content: JSON.stringify({
            ok: false,
            locationId: context.locationId,
            tool: name,
            action,
            status: "needs_details",
            message: "That session time is not available for this class. Please choose one of the available schedule slots.",
            availableSessions: alternatives,
          }),
        };
      }

      const startIso = timing.start_utc;
      const startDate = new Date(startIso);
      const endDate = new Date(startDate.getTime() + Number(session.duration || 0) * 60 * 1000);
      const endIso = endDate.toISOString();

      const duplicateRows = await db.execute(sql`
        SELECT id
        FROM reservations
        WHERE location_id = ${context.locationId}
          AND member_id = ${member.id}
          AND session_id = ${session.id}
          AND start_on = ${startIso}::timestamptz
          AND status IN ('confirmed', 'completed')
        LIMIT 1
      `) as unknown as Array<{ id: string }>;

      const existingReservation = duplicateRows.at(0);
      if (existingReservation) {
        return {
          content: JSON.stringify({
            ok: true,
            locationId: context.locationId,
            tool: name,
            action,
            status: "already_booked",
            reservationId: existingReservation.id,
            message: "This reservation already exists for the requested slot.",
          }),
        };
      }

      const insertRows = await db.execute(sql`
        INSERT INTO reservations (
          session_id,
          start_on,
          end_on,
          location_id,
          member_id,
          program_id,
          program_name,
          session_time,
          session_duration,
          session_day,
          status,
          is_make_up_class,
          updated_at
        ) VALUES (
          ${session.id},
          ${startIso}::timestamptz,
          ${endIso}::timestamptz,
          ${context.locationId},
          ${member.id},
          ${program.id},
          ${program.name},
          ${requestedTime}::time,
          ${session.duration},
          ${session.day},
          'confirmed',
          false,
          now()
        )
        RETURNING id
      `) as unknown as Array<{ id: string }>;

      return {
        content: JSON.stringify({
          ok: true,
          locationId: context.locationId,
          tool: name,
          action,
          status: "booked",
          reservationId: insertRows[0]?.id || null,
          memberName: `${member.first_name || ""}${member.last_name ? ` ${member.last_name}` : ""}`.trim(),
          programName: program.name,
          startOnUtc: startIso,
          locationTimezone,
          startOnLocation: formatHumanDateInTimezone(startIso, locationTimezone),
          message: "Reservation confirmed and created.",
        }),
      };
    }

    if (action !== "check") {
      return {
        content: JSON.stringify({
          ok: false,
          locationId: context.locationId,
          tool: name,
          action,
          status: "unsupported_action",
          message: "Only booking creation is supported right now for confirmed schedule actions.",
        }),
      };
    }

    const rows = await db.execute(sql`
      SELECT
        COUNT(*)::bigint AS total,
        MIN(start_on) AS earliest,
        MAX(start_on) AS latest
      FROM reservations
      WHERE location_id = ${context.locationId}
        AND start_on >= now()
        AND start_on < now() + (${days} * interval '1 day')
        AND status = 'confirmed'
    `) as unknown as Array<{ total: number; earliest: string | null; latest: string | null }>;

    const row = rows[0] || { total: 0, earliest: null, latest: null };
    return {
      content: JSON.stringify({
        ok: true,
        locationId: context.locationId,
        tool: name,
        action: "check",
        rangeDays: days,
        confirmedReservations: Number(row.total || 0),
        earliestStart: row.earliest,
        latestStart: row.latest,
      }),
    };
  }

  if (name === "member_lookup") {
    const rawQuery = typeof input.query === "string"
      ? input.query.trim()
      : [input.name, input.memberName, input.email, input.phone]
          .filter((value) => typeof value === "string")
          .map((value) => (value as string).trim())
          .filter((value) => value.length > 0)
          .join(" ");
    if (!rawQuery) {
      return {
        content: JSON.stringify({ ok: false, error: "Missing member lookup query" }),
      };
    }

    const signals = extractMemberLookupSignals(rawQuery);
    if (!signals.searchText) {
      return {
        content: JSON.stringify({
          ok: false,
          error: "Member lookup needs a name, email, or phone number",
        }),
      };
    }

    const searchLike = `%${signals.searchText}%`;
    const emailLike = signals.email ? `%${signals.email}%` : null;
    const phoneLike = signals.phoneDigits ? `%${signals.phoneDigits}%` : null;
    const tokenLikes = signals.tokens.map((token) => `%${token}%`);
    const emailCondition = emailLike ? sql`m.email ILIKE ${emailLike}` : sql`false`;
    const phoneCondition = phoneLike
      ? sql`regexp_replace(COALESCE(m.phone, ''), '\\D', '', 'g') LIKE ${phoneLike}`
      : sql`false`;

    const rows = await db.execute(sql`
      SELECT
        m.id,
        m.first_name,
        m.last_name,
        m.email,
        m.phone,
        ml.status,
        ml.points,
        m.created_at
      FROM member_locations ml
      JOIN members m ON m.id = ml.member_id
      WHERE ml.location_id = ${context.locationId}
        AND (
          concat_ws(' ', COALESCE(m.first_name, ''), COALESCE(m.last_name, '')) ILIKE ${searchLike}
          OR concat_ws(' ', COALESCE(m.last_name, ''), COALESCE(m.first_name, '')) ILIKE ${searchLike}
          OR m.email ILIKE ${searchLike}
          OR COALESCE(m.phone, '') ILIKE ${searchLike}
          OR (${emailCondition})
          OR (${phoneCondition})
          OR (${tokenLikes.length > 0 ? sql.join(tokenLikes.map((tokenLike) => sql`
              m.first_name ILIKE ${tokenLike}
              OR m.last_name ILIKE ${tokenLike}
              OR m.email ILIKE ${tokenLike}
              OR COALESCE(m.phone, '') ILIKE ${tokenLike}
            `), sql` OR `) : sql`false`})
        )
      ORDER BY m.created_at DESC
      LIMIT 30
    `) as unknown as Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string;
      phone: string | null;
      status: string;
      points: number;
      created_at: string;
    }>;

    const scored = rows
      .map((member) => ({
        ...member,
        score: scoreMemberCandidate(member, signals),
      }))
      .filter((member) => member.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
      .slice(0, 5);

    return {
      content: JSON.stringify({
        ok: true,
        locationId: context.locationId,
        tool: name,
        query: rawQuery,
        normalizedQuery: signals.searchText,
        count: scored.length,
        members: scored.map((member) => ({
          id: member.id,
          name: `${member.first_name}${member.last_name ? ` ${member.last_name}` : ""}`.trim(),
          email: member.email,
          phone: member.phone,
          status: member.status,
          points: Number(member.points || 0),
          score: member.score,
        })),
      }),
    };
  }

  const metric = typeof input.metric === "string" ? input.metric : "active_members";
  const rangeText = typeof input.range === "string" ? input.range : "last 30 days";
  const rangeDays = parseRangeDays(rangeText);
  const report = await fetchReportWithChart(context.locationId, metric, rangeDays);

  return {
    content: JSON.stringify({
      ok: true,
      locationId: context.locationId,
      tool: "location_reports",
      metric: report.metric,
      rangeDays: report.rangeDays,
      current: report.current,
      previous: report.previous,
      trend: report.direction,
      changePercent: report.changePercent,
      chartBlock: report.chartBlock,
    }),
  };
}

function getAssistantModel() {
  return new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    modelName: process.env.ASSISTANT_MODEL || "gpt-4.1-mini",
    temperature: 0.7,
    maxRetries: 3,
  });
}

function parseExplicitPreference(message: string): RememberPreferenceInput | null {
  const normalized = message.trim();
  const lower = normalized.toLowerCase();
  const hasRememberIntent =
    lower.includes("remember") ||
    lower.includes("remind me") ||
    lower.includes("keep reminding me");

  if (!hasRememberIntent) {
    return null;
  }

  const value = normalized
    .replace(/^(can you|could you|would you|please)\s+/i, "")
    .replace(/^remember\s+that\s+/i, "")
    .replace(/^remember\s+to\s+/i, "")
    .replace(/^remember\s+/i, "")
    .replace(/^remind me\s+to\s+/i, "")
    .replace(/^remind me\s+/i, "")
    .replace(/[?.!]+$/g, "")
    .trim();

  if (!value) return null;

  return {
    preferenceType: "custom",
    value: { note: value },
    reason: "Explicit vendor preference",
  };
}

function buildToolCalls(message: string, explicitPreference: RememberPreferenceInput | null): AssistantToolCall[] {
  const lower = message.toLowerCase();
  const calls: AssistantToolCall[] = [];

  if (lower.includes("schedule") || lower.includes("calendar") || lower.includes("book")) {
    calls.push({
      name: "schedule_manage",
      input: { intent: "inspect_or_manage_schedule" },
    });
  }

  if (lower.includes("member") || lower.includes("student") || lower.includes("subscription")) {
    calls.push({
      name: "member_lookup",
      input: { intent: "lookup_member_context" },
    });
  }

  if (lower.includes("report") || lower.includes("revenue") || lower.includes("attendance") || lower.includes("kpi")) {
    calls.push({
      name: "location_reports",
      input: { intent: "fetch_location_report_summary" },
    });
  }

  if (explicitPreference) {
    calls.push({
      name: "remember_preference",
      input: explicitPreference as unknown as Record<string, unknown>,
    });
  }

  return calls;
}

async function recallMemories(locationId: string, message: string): Promise<RecalledMemory[]> {
  try {
    const embedding = await buildEmbeddingVector(message);

    if (embedding && embedding.length > 0) {
      const vectorLiteral = toVectorLiteral(embedding);
      const rows = await db.execute(sql`
        SELECT
          id,
          content,
          (1 - (embedding <=> ${vectorLiteral}::vector))::float AS score
        FROM assistant_memories
        WHERE location_id = ${locationId}
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${vectorLiteral}::vector
        LIMIT 6
      `) as unknown as Array<{ id: string; content: string; score: number }>;

      if (rows.length > 0) {
        return rows
          .map((row) => ({
            id: row.id,
            content: row.content,
            score: Number(row.score || 0),
          }))
          .filter((row) => row.content?.trim().length > 0);
      }
    }

    const lexical = `%${message.trim().slice(0, 120)}%`;
    const rows = await db.execute(sql`
      SELECT id, content
      FROM assistant_memories
      WHERE location_id = ${locationId}
        AND content ILIKE ${lexical}
      ORDER BY created_at DESC
      LIMIT 5
    `) as unknown as Array<{ id: string; content: string }>;

    return rows.map((row) => ({ id: row.id, content: row.content, score: 0.2 }));
  } catch {
    return [];
  }
}

async function enqueueWritebackJob(job: AssistantMemoryWritebackJob) {
  await assistantMemoryWritebackQueue.add("memory:writeback", job, {
    jobId: `mem-write-${job.locationId}-${job.threadId}-${Date.now()}`,
  });

  await assistantMemoryWritebackQueue.add(
    "memory:thread-finalize",
    {
      locationId: job.locationId,
      threadId: job.threadId,
      triggerAt: new Date().toISOString(),
    },
    {
      jobId: `mem-finalize-${job.locationId}-${job.threadId}-${Date.now()}`,
      delay: Number(process.env.ASSISTANT_THREAD_IDLE_MS || 10 * 60 * 1000),
    },
  );
}

function buildReply(message: string, locationId: string, memories: RecalledMemory[], explicitSaved: boolean) {
  const lower = message.toLowerCase();
  const memoryHint = memories.length > 0 ? ` I also recalled ${memories.length} location memory item(s).` : "";

  if (explicitSaved) {
    return `Saved. I will remember that preference for location ${locationId}.${memoryHint}`;
  }

  if (lower.includes("schedule") || lower.includes("calendar")) {
    return `I can help with scheduling for location ${locationId}. Tell me what to create, update, or cancel and include the date range.${memoryHint}`;
  }

  if (lower.includes("report") || lower.includes("revenue") || lower.includes("attendance")) {
    return `I can prepare location reports for ${locationId}. Tell me the KPI and timeframe (for example: last 30 days attendance).${memoryHint}`;
  }

  if (lower.includes("member") || lower.includes("student")) {
    return `I can look up member details scoped to location ${locationId}. Share the member name, email, or phone.${memoryHint}`;
  }

  return `I am scoped to location ${locationId}. Ask about schedules, reports, or members and I will help.${memoryHint}`;
}

function extractClarificationQuestions(reply: string): string[] {
  const matches = reply
    .split(/\s+/)
    .join(" ")
    .match(/[^?]+\?/g);

  if (!matches || matches.length === 0) {
    const lowered = reply.toLowerCase();
    if (lowered.includes("need more details") || lowered.includes("need more info") || lowered.includes("please clarify")) {
      return [reply.trim()];
    }
    return [];
  }

  return matches
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .slice(0, 3);
}

function buildPromptId(prefix: string, index: number) {
  return `${prefix}-${index + 1}-${Math.random().toString(36).slice(2, 8)}`;
}

function shouldRequireConfirmation(toolExecutions: ToolExecutionTrace[]): boolean {
  return toolExecutions.some((trace) => {
    if (trace.name !== "schedule_manage" || !trace.output) return false;
    const status = typeof trace.output.status === "string" ? trace.output.status.toLowerCase() : "";
    const action = typeof trace.output.action === "string" ? trace.output.action.toLowerCase() : "";
    return status === "requires_confirmation" && action !== "check";
  });
}

function isSimpleFollowUpQuestion(reply: string): boolean {
  const normalized = reply.toLowerCase().replace(/\s+/g, " ").trim();
  return normalized.includes("how can i assist you further")
    || normalized.includes("what else can i help with")
    || normalized.includes("anything else you would like me to do")
    || normalized.includes("anything else i can help with");
}

function hasTerminalScheduleOutcome(toolExecutions: ToolExecutionTrace[]): boolean {
  const terminal = new Set(["booked", "already_booked", "cancelled_by_user"]);
  return toolExecutions.some((trace) => {
    if (trace.name !== "schedule_manage" || !trace.output) return false;
    const status = typeof trace.output.status === "string" ? trace.output.status.toLowerCase() : "";
    return terminal.has(status);
  });
}

function extractBookingMeta(toolExecutions: ToolExecutionTrace[]): AssistantBookingMeta | undefined {
  for (let i = toolExecutions.length - 1; i >= 0; i -= 1) {
    const trace = toolExecutions[i];
    if (!trace) continue;
    if (trace.name !== "schedule_manage" || !trace.output) continue;

    const status = typeof trace.output.status === "string" ? trace.output.status.toLowerCase() : "";
    if (status !== "booked") continue;

    const startOnUtc = typeof trace.output.startOnUtc === "string" ? trace.output.startOnUtc : "";
    const locationTimezone = typeof trace.output.locationTimezone === "string" ? trace.output.locationTimezone : "UTC";
    const startOnLocation = typeof trace.output.startOnLocation === "string"
      ? trace.output.startOnLocation
      : formatHumanDateInTimezone(startOnUtc, locationTimezone);

    if (!startOnUtc) return undefined;

    return {
      reservationId: typeof trace.output.reservationId === "string" ? trace.output.reservationId : null,
      startOnUtc,
      locationTimezone,
      startOnLocation,
    };
  }

  return undefined;
}

function extractChartBlocks(toolExecutions: ToolExecutionTrace[]): AssistantBlock[] {
  const blocks: AssistantBlock[] = [];
  const seen = new Set<string>();

  for (const trace of toolExecutions) {
    if (trace.name !== "location_reports" || !trace.output) continue;
    const rawBlock = trace.output.chartBlock;
    if (typeof rawBlock !== "object" || rawBlock === null) continue;

    const parsed = assistantChartBlockSchema.safeParse(rawBlock);
    if (!parsed.success) continue;

    const block = parsed.data as AssistantBlock;
    if (seen.has(block.id)) continue;
    seen.add(block.id);
    blocks.push(block);
  }

  return blocks;
}

function deriveAssistantUiState(params: {
  reply: string;
  toolExecutions: ToolExecutionTrace[];
}): {
  responseState: AssistantResponseState;
  prompts: AssistantPrompt[];
  inputMode: "free_text" | "prompt_only";
} {
  const requiresConfirmation = shouldRequireConfirmation(params.toolExecutions);
  if (requiresConfirmation) {
    return {
      responseState: "confirm_action",
      inputMode: "prompt_only",
      prompts: [
        {
          id: buildPromptId("confirm", 0),
          kind: "confirm",
          question: "Please confirm if you want me to proceed with this requested change.",
          required: true,
          risk: "high",
          blocking: true,
          responseChannel: "inline",
          options: [
            { label: "Confirm", value: "confirm" },
            { label: "Cancel", value: "cancel" },
          ],
        },
      ],
    };
  }

  const clarificationQuestions = extractClarificationQuestions(params.reply);
  if (hasTerminalScheduleOutcome(params.toolExecutions)) {
    return {
      responseState: "answer",
      inputMode: "free_text",
      prompts: [],
    };
  }

  if (clarificationQuestions.length > 0 && !isSimpleFollowUpQuestion(params.reply)) {
    return {
      responseState: "ask_clarification",
      inputMode: "free_text",
      prompts: clarificationQuestions.map((question, index) => ({
        id: buildPromptId("clarify", index),
        kind: "text",
        question,
        required: true,
        risk: "low",
        blocking: false,
        responseChannel: "chatbox",
        placeholder: "Type your answer...",
      })),
    };
  }

  return {
    responseState: "answer",
    inputMode: "free_text",
    prompts: [],
  };
}

async function runToolLoop(params: {
  locationId: string;
  vendorId: string;
  userId: string;
  threadId: string;
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  recalledMemories: RecalledMemory[];
  inferredExplicitPreference: RememberPreferenceInput | null;
}) {
  const model = getAssistantModel();
  const modelWithTools = model.bindTools(toolDefinitions);
  const memoryContext = params.recalledMemories.length > 0
    ? params.recalledMemories.map((memory) => `- ${memory.content}`).join("\n")
    : "- none";

  const system = new SystemMessage([
    "You are Monstro Location Assistant.",
    "You are scoped to exactly one location and must never mix cross-location context.",
    "Use tools when needed. For actions that are not fully certain, ask for missing details.",
    "Only use remember_preference when user explicitly asks to remember something.",
    "When user explicitly asks to remember a preference, call remember_preference in the same turn.",
    "When a tool returns concrete values, summarize and present them directly.",
    "If schedule_manage returns status booked, already_booked, cancelled_by_user, needs_details, or unsupported_action, do not ask the user to confirm again unless status is requires_confirmation.",
    "Do not say data is unavailable or still loading unless the tool explicitly returns an error.",
    `Location scope: ${params.locationId}`,
    "Recalled memory:",
    memoryContext,
  ].join("\n"));

  const messages: Array<SystemMessage | HumanMessage | AIMessage | ToolMessage> = [
    system,
  ];

  for (const entry of params.history) {
    if (entry.role === "user") {
      messages.push(new HumanMessage(entry.content));
    } else {
      messages.push(new AIMessage(entry.content));
    }
  }

  messages.push(new HumanMessage(params.message));

  const usedTools: AssistantToolCall[] = [];
  const toolExecutions: ToolExecutionTrace[] = [];
  const confirmationIntent = detectConfirmationIntent(params.message);
  let explicitPreference: RememberPreferenceInput | null = params.inferredExplicitPreference;
  let finalReply = "";

  for (let step = 0; step < MAX_TOOL_ITERATIONS; step += 1) {
    const response = await modelWithTools.invoke(messages);
    const aiMessage = response as AIMessage;
    const toolCalls = Array.isArray(aiMessage.tool_calls) ? aiMessage.tool_calls : [];

    if (toolCalls.length === 0) {
      finalReply = toTextContent(aiMessage.content);
      if (!finalReply) {
        finalReply = `I am scoped to location ${params.locationId}. Ask about schedules, reports, or members and I will help.`;
      }
      break;
    }

    messages.push(aiMessage);

    for (const toolCall of toolCalls) {
      const name = toolCall.name as AssistantToolName;
      if (!assistantToolNames.includes(name)) {
        const unsupported = new ToolMessage({
          content: JSON.stringify({ ok: false, error: `Unsupported tool: ${toolCall.name}` }),
          tool_call_id: toolCall.id || crypto.randomUUID(),
          name: toolCall.name,
        });
        messages.push(unsupported);
        continue;
      }

      const toolInput = parseToolInput(toolCall.args);
      usedTools.push({
        name,
        input: toolInput,
      });

      const execution = await executeToolCall(name, toolInput, {
        locationId: params.locationId,
        vendorId: params.vendorId,
        userId: params.userId,
        threadId: params.threadId,
        message: params.message,
        history: params.history,
        confirmationIntent,
      });

      let parsedToolOutput: Record<string, unknown> | null = null;
      try {
        const parsed = JSON.parse(execution.content);
        if (typeof parsed === "object" && parsed !== null) {
          parsedToolOutput = parsed as Record<string, unknown>;
        }
      } catch {
        parsedToolOutput = null;
      }

      toolExecutions.push({
        name,
        output: parsedToolOutput,
      });

      if (execution.explicitPreference) {
        const currentScore = preferenceSignalScore(explicitPreference);
        const nextScore = preferenceSignalScore(execution.explicitPreference);
        if (!explicitPreference || nextScore >= currentScore) {
          explicitPreference = execution.explicitPreference;
        }
      }

      const toolMessage = new ToolMessage({
        content: execution.content,
        tool_call_id: toolCall.id || crypto.randomUUID(),
        name,
      });
      messages.push(toolMessage);
    }
  }

  if (explicitPreference && !usedTools.some((tool) => tool.name === "remember_preference")) {
    usedTools.push({
      name: "remember_preference",
      input: explicitPreference as unknown as Record<string, unknown>,
    });
  }

  if (!finalReply) {
    finalReply = buildReply(params.message, params.locationId, params.recalledMemories, !!explicitPreference);
  }

  return {
    reply: finalReply,
    usedTools,
    explicitPreference,
    toolExecutions,
  };
}

export async function runAssistantTurn(props: RunAssistantTurnProps): Promise<AssistantChatResult> {
  const parsed = assistantChatRequestSchema.safeParse({
    message: props.message,
    threadId: props.threadId,
    history: props.history,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }

  const threadId = props.threadId || crypto.randomUUID();
  const inferredExplicitPreference = parseExplicitPreference(parsed.data.message);
  const recalledMemories = await recallMemories(props.locationId, parsed.data.message);
  const loopResult = await runToolLoop({
    locationId: props.locationId,
    vendorId: props.vendorId,
    userId: props.userId,
    threadId,
    message: parsed.data.message,
    history: parsed.data.history || [],
    recalledMemories,
    inferredExplicitPreference,
  });

  const writebackJob: AssistantMemoryWritebackJob = {
    locationId: props.locationId,
    vendorId: props.vendorId,
    userId: props.userId,
    threadId,
    userMessage: parsed.data.message,
    assistantReply: loopResult.reply,
    toolCalls: loopResult.usedTools,
    explicitPreference: loopResult.explicitPreference || undefined,
    createdAt: new Date().toISOString(),
  };

  await enqueueWritebackJob(writebackJob);

  const uiState = deriveAssistantUiState({
    reply: loopResult.reply,
    toolExecutions: loopResult.toolExecutions,
  });
  const bookingMeta = extractBookingMeta(loopResult.toolExecutions);
  const blocks = extractChartBlocks(loopResult.toolExecutions);

  return {
    threadId,
    reply: loopResult.reply,
    usedTools: loopResult.usedTools,
    memorySaved: !!loopResult.explicitPreference,
    bookingMeta,
    blocks,
    responseState: uiState.responseState,
    prompts: uiState.prompts,
    inputMode: uiState.inputMode,
    promptPolicy: {
      allowMultiple: true,
      maxPromptsThisTurn: uiState.prompts.length,
    },
  };
}
