import type { ToolArgs, ToolExecutorResult } from "../type";
import { executeAsk } from "./ask";
import { executeCancelSession } from "./cancelSession";
import { executeClarify } from "./clarify";
import { TOOLS_DEFINITIONS } from "./definitions";
import { executeRetryFailed } from "./retryFailed";
import { executeScheduleSession } from "./scheduleSession";
import { jsonResult, normalizeToolArgs } from "../utils";

export { parseToolArgs, jsonResult, lastPausedTask, mergeResumeArgs, compactArgs, applyMentions } from "../utils";

export const TOOLS = TOOLS_DEFINITIONS;
export const TOOL_NAMES = TOOLS.map((tool) => tool.function.name);

function attachPauseState(result: ToolExecutorResult, name: string, args: ToolArgs): ToolExecutorResult {
    if (!result.pause) return result;
    try {
        const payload = JSON.parse(result.content) as Record<string, unknown>;
        const previous = payload.args && typeof payload.args === "object" ? payload.args as ToolArgs : {};
        payload.tool = name;
        payload.args = { ...previous, ...args };
        return { ...result, content: JSON.stringify(payload) };
    } catch {
        return result;
    }
}

export async function executeTool(name: string, args: ToolArgs, locationId: string): Promise<ToolExecutorResult> {
    const normalized = normalizeToolArgs(args);
    if (name === "ask") return executeAsk(normalized);
    if (name === "clarify") return executeClarify(normalized);
    if (name === "retry_failed") {
        return attachPauseState(await executeRetryFailed(normalized, locationId), name, normalized);
    }
    if (name === "cancel_session") {
        return attachPauseState(await executeCancelSession(normalized, locationId), name, normalized);
    }
    if (name === "schedule_session") {
        return attachPauseState(await executeScheduleSession(normalized, locationId), name, normalized);
    }
    return { content: jsonResult({ ok: false, error: `Unsupported tool: ${name}` }) };
}
