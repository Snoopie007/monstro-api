import { calculateAICost } from "@/libs/ai/AI";
import {
    STAFF_SYSTEM_PROMPT,
    TASK_OPTIONS,
    TASK_QUESTION,
    TOOL_NAMES,
    TOOLS,
    executeTool,
    isAwaitingStaffFollowUp,
    jsonResult,
    lastPausedTask,
    loadAgentHistory,
    mergeResumeArgs,
    compactArgs,
    parseToolArgs,
    applyMentions,
    saveAgentMessages,
    shouldOfferTaskPicker,
    sse,
    toTextContent,
    type AgentMention,
    type Send,
    type ToolExecutorResult,
} from "@/libs/ai/staff";
import { Wallet } from "@/libs/wallet";
import {
    AIMessage,
    AIMessageChunk,
    HumanMessage,
    SystemMessage,
    ToolMessage,
} from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Elysia, t } from "elysia";
import { db } from "@/db/db";

const MAX_TOOL_ITERATIONS = 5;
const HISTORY_TTL = 60 * 60;
const AGENT_MODEL = "gpt-4.1-mini";

type TokenUsage = {
    promptTokens: number;
    completionTokens: number;
};

type AgentTurnResult = {
    // False when we served the hardcoded task menu and never called OpenAI.
    usedModel: boolean;
    cost: number;
};

function estimateTokensFromText(text: string) {
    if (!text.trim()) return 0;
    return Math.max(1, Math.ceil(text.length / 4));
}

// Ceiling we hold on the location wallet before the stream starts.
// Same pricing helper as the vendor assistant (margin + $0.01 floor → 1).
function estimateStaffAgentTurnCost(message: string, historyText = "") {
    const promptTokens = estimateTokensFromText(message) + estimateTokensFromText(historyText) + 1500;
    const completionTokens = 900;
    return Math.max(1, calculateAICost({ promptTokens, completionTokens }, AGENT_MODEL));
}

function emptyUsage(): TokenUsage {
    return { promptTokens: 0, completionTokens: 0 };
}

function addUsage(total: TokenUsage, next: TokenUsage) {
    total.promptTokens += next.promptTokens;
    total.completionTokens += next.completionTokens;
}

function billableCost(usage: TokenUsage) {
    return Math.max(1, calculateAICost(usage, AGENT_MODEL));
}

function usageFromChunk(chunk: AIMessageChunk | undefined): TokenUsage {
    if (!chunk) return emptyUsage();

    const meta = chunk.usage_metadata;
    if (meta && (meta.input_tokens || meta.output_tokens)) {
        return {
            promptTokens: Number(meta.input_tokens || 0),
            completionTokens: Number(meta.output_tokens || 0),
        };
    }

    const tokenUsage = (chunk.response_metadata as { tokenUsage?: Record<string, number>; usage?: Record<string, number> } | undefined)?.tokenUsage
        || (chunk.response_metadata as { usage?: Record<string, number> } | undefined)?.usage;
    if (!tokenUsage) return emptyUsage();

    return {
        promptTokens: Number(tokenUsage.promptTokens || tokenUsage.prompt_tokens || 0),
        completionTokens: Number(tokenUsage.completionTokens || tokenUsage.completion_tokens || 0),
    };
}

function sendPause(send: Send, threadId: string, callId: string, result: ToolExecutorResult) {
    if (result.ask) {
        send("ask", { id: callId, question: result.ask.question });
        send("awaiting_input", { ts: Date.now(), threadId });
        return;
    }
    if (result.clarify) {
        send("clarify", {
            id: callId,
            question: result.clarify.question,
            options: result.clarify.options,
        });
        send("awaiting_input", { ts: Date.now(), threadId });
    }
}

function toAiMessage(chunk: AIMessageChunk) {
    return new AIMessage({
        content: chunk.content,
        tool_calls: chunk.tool_calls,
        additional_kwargs: chunk.additional_kwargs,
        response_metadata: chunk.response_metadata,
        id: chunk.id,
        usage_metadata: chunk.usage_metadata,
    });
}

async function streamModelTurn(
    model: ReturnType<ChatOpenAI["bindTools"]>,
    messages: Array<SystemMessage | HumanMessage | AIMessage | ToolMessage>,
    send: Send,
) {
    let assembled: AIMessageChunk | undefined;
    let text = "";
    let index = 0;

    for await (const chunk of await model.stream(messages)) {
        assembled = assembled ? assembled.concat(chunk) : chunk;
        const delta = toTextContent(chunk.content);
        if (!delta) continue;
        text += delta;
        send("text_delta", { delta, text, index, ts: Date.now() });
        index += 1;
    }

    const aiMessage = assembled ? toAiMessage(assembled) : new AIMessage("");
    const toolCalls = Array.isArray(aiMessage.tool_calls) ? aiMessage.tool_calls : [];
    return { aiMessage, text, toolCalls, usage: usageFromChunk(assembled) };
}

function userMessageContent(message: string, mentions: AgentMention[]) {
    const resolved = mentions
        .map((mention) => ({ id: mention.id.trim(), label: mention.label.trim() }))
        .filter((mention) => mention.id && mention.label);
    if (resolved.length === 0) return message;
    return `${message}\nmentions: ${resolved.map((mention) => `${mention.id}=${mention.label}`).join(", ")}`;
}

async function runAgent(params: {
    lid: string;
    sid: string;
    threadId: string;
    sessionId: string;
    message: string;
    mentions?: AgentMention[];
    send: Send;
    stored?: Awaited<ReturnType<typeof loadAgentHistory>>;
}): Promise<AgentTurnResult> {

    const { lid, sid, threadId, sessionId, message, send } = params;
    const mentions = params.mentions ?? [];

    const stored = params.stored ?? await loadAgentHistory(sessionId);
    if (shouldOfferTaskPicker(message, isAwaitingStaffFollowUp(stored))) {
        const userMessage = new HumanMessage(userMessageContent(message, mentions));
        await saveAgentMessages(sessionId, [userMessage], HISTORY_TTL);
        send("clarify", {
            id: crypto.randomUUID(),
            question: TASK_QUESTION,
            options: TASK_OPTIONS.map((option) => ({ id: option.id, label: option.label })),
        });
        send("awaiting_input", { ts: Date.now(), threadId });
        return { usedModel: false, cost: 0 };
    }

    const userMessage = new HumanMessage(userMessageContent(message, mentions));
    const pending: Array<HumanMessage | AIMessage | ToolMessage> = [userMessage];
    const usageTotals = emptyUsage();

    const persist = async () => {
        if (pending.length === 0) return;
        await saveAgentMessages(params.sessionId, pending, HISTORY_TTL);
        pending.length = 0;
    };

    // Token usage lands on handleLLMEnd (same path as the vendor assistant).
    // Stream chunks are a fallback if a turn does not fire that callback.
    const model = new ChatOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        modelName: AGENT_MODEL,
        temperature: 0.2,
        maxRetries: 3,
        streaming: true,
        callbacks: [{
            handleLLMEnd: (output: { llmOutput?: { tokenUsage?: Record<string, number> } }) => {
                const usage = output?.llmOutput?.tokenUsage;
                if (!usage) return;
                addUsage(usageTotals, {
                    promptTokens: Number(usage.promptTokens || 0),
                    completionTokens: Number(usage.completionTokens || 0),
                });
            },
        }],
    }).bindTools(TOOLS);

    const location = await db.query.locations.findFirst({
        where: (row, { eq }) => eq(row.id, lid),
        columns: { timezone: true },
    });
    const timezone = location?.timezone || "UTC";
    const today = toZonedTime(new Date(), timezone);

    const messages = [
        new SystemMessage([
            STAFF_SYSTEM_PROMPT.trim(),
            `Location scope: ${lid}`,
            `Staff id: ${sid}`,
            `Location timezone: ${timezone}`,
            `Today at this location: ${format(today, "EEEE, yyyy-MM-dd")}`,
        ].join("\n")),
        ...stored,
        userMessage,
    ];

    const paused = lastPausedTask(stored);
    let knownArgs = applyMentions(paused ? mergeResumeArgs(paused, message) : {}, mentions);
    if (paused) {
        send("status", { text: "Planning next steps...." });
        const callId = crypto.randomUUID();
        send("tool_start", { id: callId, name: paused.name });
        const result = await executeTool(paused.name, knownArgs, lid);
        const aiMessage = new AIMessage({
            content: "",
            tool_calls: [{ id: callId, name: paused.name, args: knownArgs, type: "tool_call" }],
        });
        const toolMessage = new ToolMessage({
            content: result.content,
            tool_call_id: callId,
            name: paused.name,
        });
        messages.push(aiMessage, toolMessage);
        pending.push(aiMessage, toolMessage);

        if (result.pause && (result.ask || result.clarify)) {
            await persist();
            sendPause(send, threadId, callId, result);
            return { usedModel: false, cost: 0 };
        }

        send("tool_result", { id: callId, name: paused.name, result: JSON.parse(result.content) });
    }

    for (let step = 0; step < MAX_TOOL_ITERATIONS; step += 1) {
        send("status", { text: step === 0 ? "Planning next steps...." : "Working on it...." });
        const beforeUsage = { ...usageTotals };

        const { aiMessage, text, toolCalls, usage } = await streamModelTurn(
            model,
            messages,
            send,
        );
        if (
            usageTotals.promptTokens === beforeUsage.promptTokens
            && usageTotals.completionTokens === beforeUsage.completionTokens
        ) {
            addUsage(usageTotals, usage);
        }

        if (toolCalls.length === 0) {
            const reply = text || "I need a bit more detail to finish that request.";
            pending.push(text ? aiMessage : new AIMessage(reply));
            await persist();
            if (!text) {
                send("text_delta", { delta: reply, text: reply, index: 0, ts: Date.now() });
            }
            send("reply", { text: reply });
            send("done", { ts: Date.now(), threadId });
            return { usedModel: true, cost: billableCost(usageTotals) };
        }

        messages.push(aiMessage);
        pending.push(aiMessage);

        for (const toolCall of toolCalls) {
            const name = toolCall.name;
            const id = toolCall.id || crypto.randomUUID();
            send("tool_start", { id, name });

            if (!TOOL_NAMES.includes(name)) {
                const unsupported = new ToolMessage({
                    content: jsonResult({ ok: false, error: `Unsupported tool: ${name}` }),
                    tool_call_id: id,
                    name,
                });
                messages.push(unsupported);
                pending.push(unsupported);
                continue;
            }

            const incoming = compactArgs(parseToolArgs(toolCall.args));
            knownArgs = applyMentions({ ...knownArgs, ...incoming }, mentions);
            const result = await executeTool(name, knownArgs, lid);
            const toolMessage = new ToolMessage({
                content: result.content,
                tool_call_id: id,
                name,
            });
            messages.push(toolMessage);
            pending.push(toolMessage);

            if (result.pause && (result.ask || result.clarify)) {
                await persist();
                sendPause(send, threadId, id, result);
                return {
                    usedModel: true,
                    cost: billableCost(usageTotals),
                };
            }

            send("tool_result", { id, name, result: JSON.parse(result.content) });
        }
    }

    const fallback = "I need a bit more detail to finish that request.";
    pending.push(new AIMessage(fallback));
    await persist();
    send("text_delta", { delta: fallback, text: fallback, index: 0, ts: Date.now() });
    send("reply", { text: fallback });
    send("done", { ts: Date.now(), threadId });
    return {
        usedModel: true,
        cost: billableCost(usageTotals),
    };
}


export function slAgentRoutes(app: Elysia) {

    app.post("/agent", async ({ body, params, status, request }) => {
        const { staffId, lid } = params;
        const { message, mentions = [] } = body;

        // Generate a unique thread ID for the conversation.
        const threadId = body.threadId || crypto.randomUUID();
        const sessionId = `staff:${lid}:${staffId}:${threadId}`;

        const stored = await loadAgentHistory(sessionId);
        const offerTaskPicker = shouldOfferTaskPicker(message, isAwaitingStaffFollowUp(stored));
        const wallet = new Wallet(lid);
        const operationId = crypto.randomUUID();
        const reservedAmount = offerTaskPicker
            ? 0
            : estimateStaffAgentTurnCost(
                message,
                stored.map((entry) => toTextContent(entry.content)).join(" "),
            );

        // Hold funds on the location wallet before SSE starts. After the stream
        // is open we can only settle/void — we cannot return HTTP 402.
        if (reservedAmount > 0) {
            const reserveResult = await wallet.reserveAtomic({
                amount: reservedAmount,
                description: "staff_agent",
                id: operationId,
            });

            if (!reserveResult.ok) {
                return status(402, {
                    message: "Insufficient wallet funds for staff agent request",
                    code: reserveResult.reason || "INSUFFICIENT_FUNDS",
                });
            }
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
            async start(controller) {
                let finalizationState: "pending" | "settled" | "voided" = "pending";

                const voidReservedHold = async () => {
                    if (finalizationState !== "pending") return;
                    const voidResult = await wallet.voidAtomic({ ledgerId: operationId });
                    if (voidResult.ok) {
                        finalizationState = "voided";
                    }
                };

                const settleReservedBudget = async (actualAmount: number) => {
                    if (finalizationState !== "pending") return;

                    const settleResult = await wallet.settleAtomic({
                        ledgerId: operationId,
                        actualAmount,
                    });
                    if (settleResult.ok) {
                        finalizationState = "settled";
                        return;
                    }
                    await voidReservedHold();
                };

                const send: Send = (event, data) => {
                    controller.enqueue(encoder.encode(sse(event, data)));
                };

                // Client disconnect / abort must not leave a dangling reservation.
                const abortSignal = request?.signal;
                const onAbort = () => {
                    void voidReservedHold();
                };

                if (abortSignal) {
                    if (abortSignal.aborted) {
                        await voidReservedHold();
                        controller.close();
                        return;
                    }
                    abortSignal.addEventListener("abort", onAbort, { once: true });
                }

                try {
                    send("start", { ts: Date.now(), message, locationId: lid, threadId });
                    const result = await runAgent({
                        lid,
                        sid: staffId,
                        threadId,
                        sessionId,
                        message,
                        mentions,
                        send,
                        stored,
                    });

                    if (result.usedModel) {
                        await settleReservedBudget(result.cost);
                    } else {
                        await voidReservedHold();
                    }
                } catch (error) {
                    await voidReservedHold();
                    const errorMessage = error instanceof Error ? error.message : "Agent request failed";
                    send("error", { message: errorMessage });
                } finally {
                    if (abortSignal) {
                        abortSignal.removeEventListener("abort", onAbort);
                    }
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                "content-type": "text/event-stream; charset=utf-8",
                "cache-control": "no-cache, no-transform",
                connection: "keep-alive",
            },
        });
    }, {
        params: t.Object({
            staffId: t.String(),
            lid: t.String(),
        }),
        body: t.Object({
            message: t.String({ minLength: 1, maxLength: 40000 }),
            threadId: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
            mentions: t.Optional(t.Array(t.Object({
                id: t.String({ minLength: 1, maxLength: 80 }),
                label: t.String({ minLength: 1, maxLength: 200 }),
            }))),
        }),
    });
    return app
}