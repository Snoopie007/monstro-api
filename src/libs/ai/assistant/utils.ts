import { z } from "zod";
import type {
  AssistantBlock,
  AssistantBookingMeta,
  AssistantPrompt,
  AssistantResponseState,
  AssistantToolCall,
  AssistantToolName,
  RememberPreferenceInput,
} from "@subtrees/types/assistant";

type ToolExecutionTrace = {
  name: AssistantToolName;
  output: Record<string, unknown> | null;
};

type RecalledMemory = {
  id: string;
  content: string;
  score: number;
};

export function parseExplicitPreference(message: string): RememberPreferenceInput | null {
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

export function buildReply(message: string, locationId: string, memories: RecalledMemory[], explicitSaved: boolean) {
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

function buildUnsupportedCapabilityReply(locationId: string) {
  return [
    `I can't do that yet in this assistant for location ${locationId}.`,
    "Right now I can help with:",
    "- scheduling availability/checks and bookings",
    "- member lookup",
    "- location reports (revenue, attendance, active members)",
    "- remembering explicit preferences",
    "If you tell me one of those tasks, I can handle it now.",
  ].join("\n");
}

export function inferUnsupportedCapabilityReply(params: {
  message: string;
  locationId: string;
  usedTools: AssistantToolCall[];
}): string | undefined {
  if (params.usedTools.length > 0) return undefined;

  const normalized = params.message.trim().toLowerCase();
  if (!normalized) return undefined;

  const greetingOnly = /^(hi|hello|hey|yo|good\s(morning|afternoon|evening))\b/.test(normalized);
  if (greetingOnly) return undefined;

  const supportedSignals = [
    "schedule",
    "book",
    "booking",
    "session",
    "program",
    "member",
    "revenue",
    "attendance",
    "active members",
    "report",
    "kpi",
    "remember",
    "remind me",
  ];

  if (supportedSignals.some((signal) => normalized.includes(signal))) {
    return undefined;
  }

  const looksLikeCapabilityRequest =
    /\?$/.test(normalized)
    || /\b(can you|could you|would you|please|help me|i need|do|send|create|update|delete|export|email|text|sms|call)\b/.test(normalized);

  if (!looksLikeCapabilityRequest) return undefined;

  return buildUnsupportedCapabilityReply(params.locationId);
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

function hasResolvedScheduleCheckOutcome(toolExecutions: ToolExecutionTrace[]): boolean {
  return toolExecutions.some((trace) => {
    if (trace.name !== "schedule_manage" || !trace.output) return false;
    const ok = trace.output.ok;
    const action = typeof trace.output.action === "string" ? trace.output.action.toLowerCase() : "";
    return ok === true && action === "check";
  });
}

function hasLocationReportOutcome(toolExecutions: ToolExecutionTrace[]): boolean {
  return toolExecutions.some((trace) => {
    if (trace.name !== "location_reports" || !trace.output) return false;
    return trace.output.ok === true;
  });
}

function hasMemberLookupOutcome(toolExecutions: ToolExecutionTrace[]): boolean {
  return toolExecutions.some((trace) => {
    if (trace.name !== "member_lookup" || !trace.output) return false;
    return trace.output.ok === true;
  });
}

export function extractBookingMeta(
  toolExecutions: ToolExecutionTrace[],
  formatDate: (isoUtc: string, timezone: string) => string,
): AssistantBookingMeta | undefined {
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
      : formatDate(startOnUtc, locationTimezone);

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

export function extractChartBlocks(
  toolExecutions: ToolExecutionTrace[],
  chartSchema: z.ZodType<AssistantBlock>,
): AssistantBlock[] {
  const blocks: AssistantBlock[] = [];
  const seen = new Set<string>();

  for (const trace of toolExecutions) {
    if (trace.name !== "location_reports" || !trace.output) continue;
    const rawBlock = trace.output.chartBlock;
    if (typeof rawBlock !== "object" || rawBlock === null) continue;

    const parsed = chartSchema.safeParse(rawBlock);
    if (!parsed.success) continue;

    const block = parsed.data as AssistantBlock;
    if (seen.has(block.id)) continue;
    seen.add(block.id);
    blocks.push(block);
  }

  return blocks;
}

export function extractCancelledByUserReply(toolExecutions: ToolExecutionTrace[]): string | undefined {
  for (let i = toolExecutions.length - 1; i >= 0; i -= 1) {
    const trace = toolExecutions[i];
    if (!trace) continue;
    if (trace.name !== "schedule_manage" || !trace.output) continue;
    const status = typeof trace.output.status === "string" ? trace.output.status.toLowerCase() : "";
    if (status !== "cancelled_by_user") continue;
    const message = typeof trace.output.message === "string" ? trace.output.message.trim() : "";
    if (message) return message;
  }

  return undefined;
}

export function deriveAssistantUiState(params: {
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

  if (hasResolvedScheduleCheckOutcome(params.toolExecutions)) {
    return {
      responseState: "answer",
      inputMode: "free_text",
      prompts: [],
    };
  }

  if (hasLocationReportOutcome(params.toolExecutions)) {
    return {
      responseState: "answer",
      inputMode: "free_text",
      prompts: [],
    };
  }

  if (hasMemberLookupOutcome(params.toolExecutions)) {
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

export function chunkReplyText(input: string, size = 80) {
  const text = input || "";
  if (!text) return [] as string[];
  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    chunks.push(text.slice(cursor, cursor + size));
    cursor += size;
  }
  return chunks;
}
