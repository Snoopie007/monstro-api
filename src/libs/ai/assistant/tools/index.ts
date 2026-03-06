import { z } from "zod";
import { db } from "@/db/db";
import { sql } from "drizzle-orm";
import {
  MAX_TOOL_ITERATIONS,
  assistantChartBlockSchema,
  buildScheduleContextText,
  detectConfirmationIntent,
  extractMemberLookupSignals,
  fetchReportWithChart,
  formatHumanDateInTimezone,
  formatTimeHHMMSS,
  getLocationTimezone,
  parseRangeDays,
  parseRequestedDateTime,
  preferenceSignalScore,
  scoreMemberCandidate,
  type ToolExecutorContext,
  type ToolExecutorResult,
  type ToolExecutionTrace,
} from "./shared";
import { executeMemberLookupTool } from "./member";
import { executeReportTool } from "./report";
import { executeScheduleTool } from "./schedule";
import {
  assistantPreferenceTypes,
  type AssistantToolName,
  type RememberPreferenceInput,
} from "@subtrees/types/assistant";

export type { ToolExecutionTrace } from "./shared";
export {
  MAX_TOOL_ITERATIONS,
  assistantChartBlockSchema,
  detectConfirmationIntent,
  formatHumanDateInTimezone,
  preferenceSignalScore,
} from "./shared";

const rememberPreferenceInputSchemaLocal = z.object({
  preferenceType: z.enum(assistantPreferenceTypes),
  value: z.record(z.string(), z.unknown()),
  reason: z.string().trim().max(500).optional(),
});

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

export const toolDefinitions = [
  toFunctionTool(
    "schedule_manage",
    "Use for creating bookings or checking schedule availability for the current location. For questions about what programs/sessions are bookable in a date range, always use this tool with action=check.",
    {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["create", "check"],
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
        programName: {
          type: "string",
          description: "Optional specific program/class name for availability checks",
        },
        query: {
          type: "string",
          description: "Natural language scheduling query from the user",
        },
      },
      required: ["action"],
    },
  ),
  toFunctionTool(
    "member_lookup",
    "Use for member retrieval in this location: single member lookup, bulk member lists (e.g. newest members in last 30 days), and aggregate member counts.",
    {
      type: "object",
      properties: {
        mode: {
          type: "string",
          enum: ["single", "list", "aggregate"],
          description: "single for one member lookup, list for roster/bulk queries, aggregate for count summaries",
        },
        query: {
          type: "string",
          description: "Member identifier text (name/email/phone) or natural language roster filter",
        },
        status: {
          type: "string",
          description: "Optional member status filter such as active, paused, archived",
        },
        joinedWithinDays: {
          type: "number",
          description: "Optional joined-within-days filter for roster queries",
        },
        range: {
          type: "string",
          description: "Optional natural language time range, for example last 30 days",
        },
        sortBy: {
          type: "string",
          enum: ["joined_desc", "joined_asc", "name_asc", "points_desc"],
          description: "Sort mode for member list responses",
        },
        limit: {
          type: "number",
          description: "Max records to return for list mode (1-50)",
        },
        offset: {
          type: "number",
          description: "Pagination offset for list mode",
        },
      },
      required: [],
    },
  ),
  toFunctionTool(
    "location_reports",
    "Use only for KPI/report metrics (revenue, attendance, active_members) for a time range. Do NOT use this for program/session booking availability questions.",
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

export function parseToolInput(input: unknown): Record<string, unknown> {
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

export function toTextContent(content: unknown): string {
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

export async function executeToolCall(
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

    const parsed = rememberPreferenceInputSchemaLocal.safeParse(normalizedInput);
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
    return executeScheduleTool({
      name,
      input,
      context,
      deps: {
        parseRangeDays,
        buildScheduleContextText,
        parseRequestedDateTime,
        getLocationTimezone,
        formatTimeHHMMSS,
        extractMemberLookupSignals,
        scoreMemberCandidate,
        formatHumanDateInTimezone,
        db,
        sql,
      },
    });
  }

  if (name === "member_lookup") {
    return executeMemberLookupTool({
      name,
      input,
      context,
      deps: {
        parseRangeDays,
        extractMemberLookupSignals,
        scoreMemberCandidate,
        db,
        sql,
      },
    });
  }

  return executeReportTool({
    input,
    context,
    deps: {
      parseRangeDays,
      fetchReportWithChart,
    },
  });
}
