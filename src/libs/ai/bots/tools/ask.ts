import { MEMBER_QUESTION } from "../prompts";
import type { ToolArgs, ToolExecutorResult } from "../type";
import { asString, pauseAsk } from "../utils";

export async function executeAsk(args: ToolArgs): Promise<ToolExecutorResult> {
    return pauseAsk(asString(args.question) || MEMBER_QUESTION);
}
