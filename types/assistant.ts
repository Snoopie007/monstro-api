export const assistantToolNames = [
  "schedule_manage",
  "member_lookup",
  "location_reports",
  "remember_preference",
] as const;

export type AssistantToolName = (typeof assistantToolNames)[number];

export const assistantPreferenceTypes = [
  "report_format",
  "default_date_range",
  "scheduling_policy",
  "timezone",
  "custom",
] as const;

export type AssistantPreferenceType = (typeof assistantPreferenceTypes)[number];

export type RememberPreferenceInput = {
  preferenceType: AssistantPreferenceType;
  value: Record<string, unknown>;
  reason?: string;
};

export type AssistantToolCall = {
  name: AssistantToolName;
  input: Record<string, unknown>;
};

export type AssistantResponseState =
  | "answer"
  | "ask_clarification"
  | "confirm_action"
  | "handoff";

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

export type AssistantHistoryEntry = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantChatRequest = {
  message: string;
  threadId?: string;
  history?: AssistantHistoryEntry[];
};

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

export type AssistantStreamEvent =
  | {
    type: "session_start";
    threadId: string;
    messageId: string;
    ts: number;
  }
  | {
    type: "text_delta";
    threadId: string;
    messageId: string;
    delta: string;
    index: number;
    ts: number;
  }
  | {
    type: "block_done";
    threadId: string;
    messageId: string;
    block: AssistantBlock;
    ts: number;
  }
  | {
    type: "assistant_final";
    threadId: string;
    messageId: string;
    result: AssistantChatResult;
    ts: number;
  }
  | {
    type: "error";
    threadId: string;
    messageId: string;
    message: string;
    ts: number;
  }
  | {
    type: "done";
    threadId: string;
    messageId: string;
    reason: "completed" | "error";
    ts: number;
  };

export type AssistantMemoryWritebackJobData = {
  turnId: string;
  locationId: string;
  vendorId: string;
  userId: string;
  threadId: string;
  userMessage: string;
  assistantReply: string;
  toolCalls: AssistantToolCall[];
  explicitPreference?: RememberPreferenceInput;
  createdAt: string;
};

export type AssistantMemoryThreadFinalizeJobData = {
  locationId: string;
  threadId: string;
  triggerAt?: string;
};
