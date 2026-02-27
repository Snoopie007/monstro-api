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

export type AssistantChatResult = {
  threadId: string;
  reply: string;
  usedTools: AssistantToolCall[];
  memorySaved: boolean;
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
};

type ToolExecutorResult = {
  content: string;
  explicitPreference?: RememberPreferenceInput;
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

type TrendReport = {
  metric: string;
  rangeDays: number;
  current: number;
  previous: number;
  direction: "up" | "down" | "flat";
  changePercent: number;
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

    if (action !== "check") {
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
    const query = typeof input.query === "string" ? input.query.trim() : "";
    if (!query) {
      return {
        content: JSON.stringify({ ok: false, error: "Missing member lookup query" }),
      };
    }

    const like = `%${query}%`;
    const rows = await db.execute(sql`
      SELECT
        m.id,
        m.first_name,
        m.last_name,
        m.email,
        m.phone,
        ml.status,
        ml.points
      FROM member_locations ml
      JOIN members m ON m.id = ml.member_id
      WHERE ml.location_id = ${context.locationId}
        AND (
          m.first_name ILIKE ${like}
          OR m.last_name ILIKE ${like}
          OR m.email ILIKE ${like}
          OR COALESCE(m.phone, '') ILIKE ${like}
        )
      ORDER BY m.created_at DESC
      LIMIT 5
    `) as unknown as Array<{
      id: string;
      first_name: string;
      last_name: string | null;
      email: string;
      phone: string | null;
      status: string;
      points: number;
    }>;

    return {
      content: JSON.stringify({
        ok: true,
        locationId: context.locationId,
        tool: name,
        query,
        count: rows.length,
        members: rows.map((member) => ({
          id: member.id,
          name: `${member.first_name}${member.last_name ? ` ${member.last_name}` : ""}`.trim(),
          email: member.email,
          phone: member.phone,
          status: member.status,
          points: Number(member.points || 0),
        })),
      }),
    };
  }

  const metric = typeof input.metric === "string" ? input.metric : "active_members";
  const rangeText = typeof input.range === "string" ? input.range : "last 30 days";
  const rangeDays = parseRangeDays(rangeText);
  const report = await fetchLocationReport(context.locationId, metric, rangeDays);

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
      });

      if (execution.explicitPreference) {
        explicitPreference = execution.explicitPreference;
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

  return {
    threadId,
    reply: loopResult.reply,
    usedTools: loopResult.usedTools,
    memorySaved: !!loopResult.explicitPreference,
  };
}
