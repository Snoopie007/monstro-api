import { z } from "zod";
import { assistantMemoryWritebackQueue } from "@/queues";
import { ChatOpenAI } from "@langchain/openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { calculateAICost } from "@/libs/ai/AI";
import { db } from "@/db/db";
import { sql } from "drizzle-orm";
import {
  assistantPreferenceTypes,
  assistantToolNames,
  type AssistantBlock,
  type AssistantBookingMeta,
  type AssistantChatRequest as SharedAssistantChatRequest,
  type AssistantChatResult,
  type AssistantChartBlock,
  type AssistantMemoryWritebackJobData as SharedAssistantMemoryWritebackJob,
  type AssistantPrompt,
  type AssistantResponseState,
  type AssistantStreamEvent,
  type AssistantToolCall,
  type AssistantToolName,
  type RememberPreferenceInput,
} from "@subtrees/types/assistant";
import {
  buildReply,
  chunkReplyText,
  deriveAssistantUiState,
  extractBookingMeta,
  extractCancelledByUserReply,
  extractChartBlocks,
  inferUnsupportedCapabilityReply,
  parseExplicitPreference,
} from "./utils";
import {
  MAX_TOOL_ITERATIONS,
  assistantChartBlockSchema,
  detectConfirmationIntent,
  executeToolCall,
  formatHumanDateInTimezone,
  parseToolInput,
  preferenceSignalScore,
  toTextContent,
  toolDefinitions,
  type ToolExecutionTrace,
} from "./tools";

export { assistantToolNames };
export type {
  AssistantBlock,
  AssistantBookingMeta,
  AssistantChatResult,
  AssistantChartBlock,
  AssistantPrompt,
  AssistantResponseState,
  AssistantStreamEvent,
  AssistantToolCall,
  AssistantToolName,
  RememberPreferenceInput,
};

export const rememberPreferenceInputSchema = z.object({
  preferenceType: z.enum(assistantPreferenceTypes),
  value: z.record(z.string(), z.unknown()),
  reason: z.string().trim().max(500).optional(),
});

export const assistantChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  threadId: z.string().trim().min(1).max(120).optional(),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(4000),
  })).max(20).optional(),
});

export type AssistantChatRequest = SharedAssistantChatRequest;

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

export type AssistantMemoryWritebackJob = SharedAssistantMemoryWritebackJob;

type RunAssistantTurnProps = {
  locationId: string;
  vendorId: string;
  userId: string;
  message: string;
  threadId?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
};

type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
};

type RunAssistantTurnStreamProps = RunAssistantTurnProps & {
  onCompleted?: (meta: { usage: TokenUsage; cost: number }) => Promise<void> | void;
  onFailed?: () => Promise<void> | void;
};

const DEFAULT_ASSISTANT_MODEL = "gpt-4.1-mini";

type RecalledMemory = {
  id: string;
  content: string;
  score: number;
};

function getAssistantModel(onTokenUsage?: (usage: TokenUsage) => void) {
  const callbacks = onTokenUsage
    ? [{
      handleLLMEnd: (output: any) => {
        const usage = output?.llmOutput?.tokenUsage;
        if (!usage) return;
        onTokenUsage({
          promptTokens: Number(usage.promptTokens || 0),
          completionTokens: Number(usage.completionTokens || 0),
        });
      },
    }]
    : undefined;

  return new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    modelName: process.env.ASSISTANT_MODEL || DEFAULT_ASSISTANT_MODEL,
    temperature: 0.7,
    maxRetries: 3,
    callbacks,
  });
}

function getAssistantModelName() {
  return process.env.ASSISTANT_MODEL || DEFAULT_ASSISTANT_MODEL;
}

function estimateTokensFromText(text: string) {
  if (!text.trim()) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

export function estimateAssistantTurnCost(message: string, history: Array<{ role: "user" | "assistant"; content: string }> = []) {
  const historyText = history.map((entry) => entry.content).join(" ");
  const promptTokens = estimateTokensFromText(message) + estimateTokensFromText(historyText) + 1200;
  const completionTokens = 900;
  const modelName = getAssistantModelName();
  const estimatedCost = calculateAICost({ promptTokens, completionTokens }, modelName);
  return Math.max(1, estimatedCost);
}

function calculateAssistantUsageCost(usage: TokenUsage) {
  const modelName = getAssistantModelName();
  return calculateAICost(usage, modelName);
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
  const finalizeJobId = `mem-finalize-${job.locationId}-${job.threadId}`;

  await assistantMemoryWritebackQueue.add("memory:writeback", job, {
    jobId: `mem-write-${job.locationId}-${job.threadId}-${job.turnId}`,
  });

  const existingFinalizeJob = await assistantMemoryWritebackQueue.getJob(finalizeJobId);
  if (existingFinalizeJob) {
    await existingFinalizeJob.remove();
  }

  await assistantMemoryWritebackQueue.add(
    "memory:thread-finalize",
    {
      locationId: job.locationId,
      threadId: job.threadId,
      triggerAt: new Date().toISOString(),
    },
    {
      jobId: finalizeJobId,
      delay: Number(process.env.ASSISTANT_THREAD_IDLE_MS || 10 * 60 * 1000),
    },
  );
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
  const usageTotals: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
  };

  const model = getAssistantModel((usage) => {
    usageTotals.promptTokens += usage.promptTokens;
    usageTotals.completionTokens += usage.completionTokens;
  });
  const modelWithTools = model.bindTools(toolDefinitions);
  const memoryContext = params.recalledMemories.length > 0
    ? params.recalledMemories.map((memory) => `- ${memory.content}`).join("\n")
    : "- none";

  const system = new SystemMessage([
    "You are Monstro Location Assistant.",
    "You are scoped to exactly one location and must never mix cross-location context.",
    "Use tools when needed. For actions that are not fully certain, ask for missing details.",
    "For questions about bookable programs/sessions or schedule availability in a date range, always call schedule_manage with action=check.",
    "location_reports is only for KPI metrics (revenue, attendance, active_members), never for schedule/program availability.",
    "For member roster requests (new members, joined in last X days, list/filter/sort), use member_lookup with mode=list or mode=aggregate as appropriate.",
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
    usage: usageTotals,
  };
}

async function runAssistantTurnInternal(props: RunAssistantTurnProps) {
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

  const reply = extractCancelledByUserReply(loopResult.toolExecutions) || loopResult.reply;
  const unsupportedReply = inferUnsupportedCapabilityReply({
    message: parsed.data.message,
    locationId: props.locationId,
    usedTools: loopResult.usedTools,
  });
  const finalReply = unsupportedReply || reply;

  const writebackJob: AssistantMemoryWritebackJob = {
    turnId: crypto.randomUUID(),
    locationId: props.locationId,
    vendorId: props.vendorId,
    userId: props.userId,
    threadId,
    userMessage: parsed.data.message,
    assistantReply: finalReply,
    toolCalls: loopResult.usedTools,
    explicitPreference: loopResult.explicitPreference || undefined,
    createdAt: new Date().toISOString(),
  };

  await enqueueWritebackJob(writebackJob);

  const uiState = deriveAssistantUiState({
    reply: finalReply,
    toolExecutions: loopResult.toolExecutions,
  });
  const bookingMeta = extractBookingMeta(loopResult.toolExecutions, formatHumanDateInTimezone);
  const blocks = extractChartBlocks(loopResult.toolExecutions, assistantChartBlockSchema as unknown as z.ZodType<AssistantBlock>);

  const result: AssistantChatResult = {
    threadId,
    reply: finalReply,
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

  return {
    result,
    usage: loopResult.usage,
    cost: calculateAssistantUsageCost(loopResult.usage),
  };
}

export async function runAssistantTurn(props: RunAssistantTurnProps): Promise<AssistantChatResult> {
  const internal = await runAssistantTurnInternal(props);
  return internal.result;
}

export async function* runAssistantTurnStream(
  props: RunAssistantTurnStreamProps,
): AsyncGenerator<AssistantStreamEvent, void, void> {
  const threadId = props.threadId || crypto.randomUUID();
  const messageId = crypto.randomUUID();
  const startedAt = Date.now();

  yield {
    type: "session_start",
    threadId,
    messageId,
    ts: startedAt,
  };

  try {
    const internal = await runAssistantTurnInternal({
      ...props,
      threadId,
    });
    const result = internal.result;

    if (props.onCompleted) {
      await props.onCompleted({
        usage: internal.usage,
        cost: internal.cost,
      });
    }

    const textChunks = chunkReplyText(result.reply, 120);
    for (let index = 0; index < textChunks.length; index += 1) {
      const delta = textChunks[index] || "";
      if (!delta) continue;
      yield {
        type: "text_delta",
        threadId,
        messageId,
        delta,
        index,
        ts: Date.now(),
      };
    }

    for (const block of result.blocks || []) {
      yield {
        type: "block_done",
        threadId,
        messageId,
        block,
        ts: Date.now(),
      };
    }

    yield {
      type: "assistant_final",
      threadId,
      messageId,
      result,
      ts: Date.now(),
    };

    yield {
      type: "done",
      threadId,
      messageId,
      reason: "completed",
      ts: Date.now(),
    };
  } catch (error) {
    if (props.onFailed) {
      await props.onFailed();
    }

    const message = error instanceof Error ? error.message : "Failed to process assistant turn";

    yield {
      type: "error",
      threadId,
      messageId,
      message,
      ts: Date.now(),
    };

    yield {
      type: "done",
      threadId,
      messageId,
      reason: "error",
      ts: Date.now(),
    };
  }
}
