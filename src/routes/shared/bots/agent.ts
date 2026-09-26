import { calculateAICost } from "@/libs/ai/AI";
import {
	STAFF_SYSTEM_PROMPT,
	TOOL_NAMES,
	TOOLS,
	executeTool,
	jsonResult,
	compactArgs,
	parseToolArgs,
	applyMentions,
	sse,
	toTextContent,
	type AgentMention,
	type Send,
	type ToolExecutorResult,
} from "@/libs/ai/bots";
import { Wallet } from "@/libs/wallet";
import { db } from "@/db/db";
import { bots, botMessages } from "@subtrees/schemas";
import type { ToolPayload } from "@subtrees/types/bot";
import {
	AIMessage,
	AIMessageChunk,
	HumanMessage,
	SystemMessage,
	ToolMessage,
	type BaseMessage,
} from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { and, asc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const MAX_TOOL_ITERATIONS = 5;
const AGENT_MODEL = "gpt-4.1-mini";
const HISTORY_LIMIT = 40;

type TokenUsage = {
	promptTokens: number;
	completionTokens: number;
};

type AgentTurnResult = {
	usedModel: boolean;
	cost: number;
};

type ChatMessage = HumanMessage | AIMessage | ToolMessage;

function estimateTokensFromText(text: string) {
	if (!text.trim()) return 0;
	return Math.max(1, Math.ceil(text.length / 4));
}

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

function sendPause(send: Send, botId: string, callId: string, result: ToolExecutorResult) {
	if (result.ask) {
		send("ask", { id: callId, question: result.ask.question });
		send("awaiting_input", { ts: Date.now(), botId });
		return;
	}
	if (result.clarify) {
		send("clarify", {
			id: callId,
			question: result.clarify.question,
			options: result.clarify.options,
		});
		send("awaiting_input", { ts: Date.now(), botId });
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

function toolJson(content: unknown): ToolPayload | null {
	const text = toTextContent(content);
	if (!text) return null;
	try {
		const parsed = JSON.parse(text) as unknown;
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
		return parsed as ToolPayload;
	} catch {
		return null;
	}
}

function rowToMessage(row: {
	role: string;
	content: string;
	jsonContent?: ToolPayload | null;
	metadata: Record<string, unknown>;
}): ChatMessage | null {
	if (row.role === "human") return new HumanMessage(row.content);
	if (row.role === "ai") return new AIMessage(row.content);
	if (row.role === "tool_call") {
		const toolCalls = Array.isArray(row.metadata.tool_calls) ? row.metadata.tool_calls : [];
		return new AIMessage({ content: row.content, tool_calls: toolCalls as AIMessage["tool_calls"] });
	}
	if (row.role === "tool" || row.role === "tool_message") {
		return new ToolMessage({
			content: row.jsonContent ? JSON.stringify(row.jsonContent) : row.content,
			tool_call_id: typeof row.metadata.tool_call_id === "string" ? row.metadata.tool_call_id : "",
			name: typeof row.metadata.name === "string" ? row.metadata.name : undefined,
		});
	}
	return null;
}

async function loadBotHistory(botId: string) {
	const rows = await db.query.botMessages.findMany({
		where: eq(botMessages.botId, botId),
		orderBy: [asc(botMessages.created)],
	});
	return rows
		.slice(-HISTORY_LIMIT)
		.map((row) => rowToMessage({
			role: row.role,
			content: row.content,
			jsonContent: row.jsonContent,
			metadata: (row.metadata ?? {}) as Record<string, unknown>,
		}))
		.filter((message): message is ChatMessage => message !== null);
}

async function saveBotMessages(botId: string, messages: BaseMessage[]) {
	if (messages.length === 0) return;
	const started = Date.now();
	await db.insert(botMessages).values(messages.map((message, index) => {
		const type = message.getType();
		const created = new Date(started + index);
		if (type === "human") {
			return {
				botId,
				role: "human" as const,
				content: toTextContent(message.content),
				created,
			};
		}
		if (type === "tool") {
			const tool = message as ToolMessage;
			const jsonContent = toolJson(tool.content);
			return {
				botId,
				role: "tool" as const,
				content: jsonContent ? "" : toTextContent(tool.content),
				...(jsonContent ? { jsonContent } : {}),
				metadata: { tool_call_id: tool.tool_call_id, name: tool.name },
				created,
			};
		}
		const ai = message as AIMessage;
		const toolCalls = Array.isArray(ai.tool_calls) ? ai.tool_calls : [];
		if (toolCalls.length > 0) {
			return {
				botId,
				role: "tool_call" as const,
				content: toTextContent(ai.content),
				metadata: { tool_calls: toolCalls },
				created,
			};
		}
		return {
			botId,
			role: "ai" as const,
			content: toTextContent(ai.content),
			created,
		};
	}));
}

async function runAgent(params: {
	lid: string;
	userId: string;
	botId: string;
	message: string;
	mentions: AgentMention[];
	send: Send;
	stored: ChatMessage[];
	memories: string[];
}): Promise<AgentTurnResult> {
	const { lid, userId, botId, message, mentions, send, stored, memories } = params;

	const userMessage = new HumanMessage(userMessageContent(message, mentions));
	const pending: ChatMessage[] = [userMessage];
	const usageTotals = emptyUsage();
	console.log("[bot-agent] user", { botId, message });

	const persist = async () => {
		if (pending.length === 0) return;
		await saveBotMessages(botId, pending);
		pending.length = 0;
	};

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
			`User id: ${userId}`,
			`Location timezone: ${timezone}`,
			`Today at this location: ${format(today, "EEEE, yyyy-MM-dd")}`,
			...(memories.length > 0 ? [`Memories:\n${memories.map((item) => `- ${item}`).join("\n")}`] : []),
		].join("\n")),
		...stored,
		userMessage,
	];

	let knownArgs = applyMentions({}, mentions);

	for (let step = 0; step < MAX_TOOL_ITERATIONS; step += 1) {
		send("status", { text: step === 0 ? "Planning next steps...." : "Working on it...." });
		const beforeUsage = { ...usageTotals };

		const { aiMessage, text, toolCalls, usage } = await streamModelTurn(model, messages, send);
		console.log("[bot-agent] model", {
			botId,
			step,
			text,
			toolCalls: toolCalls.map((call) => ({
				id: call.id,
				name: call.name,
				args: call.args,
			})),
		});
		if (
			usageTotals.promptTokens === beforeUsage.promptTokens
			&& usageTotals.completionTokens === beforeUsage.completionTokens
		) {
			addUsage(usageTotals, usage);
		}

		if (toolCalls.length === 0) {
			const reply = text || "I need a bit more detail to finish that request.";
			pending.push(new AIMessage(reply));
			await persist();
			if (!text) {
				send("text_delta", { delta: reply, text: reply, index: 0, ts: Date.now() });
			}
			send("reply", { text: reply });
			send("done", { ts: Date.now(), botId });
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
			console.log("[bot-agent] tool", {
				botId,
				id,
				name,
				args: knownArgs,
				pause: result.pause ?? false,
				content: result.content,
			});
			const toolMessage = new ToolMessage({
				content: result.content,
				tool_call_id: id,
				name,
			});
			messages.push(toolMessage);
			pending.push(toolMessage);

			if (result.pause && (result.ask || result.clarify)) {
				const question = result.ask?.question || result.clarify?.question || "";
				if (question) pending.push(new AIMessage(question));
				await persist();
				sendPause(send, botId, id, result);
				return { usedModel: true, cost: billableCost(usageTotals) };
			}

			send("tool_result", { id, name, result: JSON.parse(result.content) });
		}
	}

	const fallback = "I need a bit more detail to finish that request.";
	pending.push(new AIMessage(fallback));
	await persist();
	send("text_delta", { delta: fallback, text: fallback, index: 0, ts: Date.now() });
	send("reply", { text: fallback });
	send("done", { ts: Date.now(), botId });
	return { usedModel: true, cost: billableCost(usageTotals) };
}

function billableCost(usage: TokenUsage) {
	return Math.max(1, calculateAICost(usage, AGENT_MODEL));
}

export async function streamBotAgent(input: {
	lid: string;
	botId: string;
	message: string;
	mentions?: AgentMention[];
	request?: Request;
}) {
	const mentions = input.mentions ?? [];
	const bot = await db.query.bots.findFirst({
		where: and(
			eq(bots.id, input.botId),
			eq(bots.locationId, input.lid),
		),
	});
	if (!bot) return { status: 404 as const, body: { error: "Bot not found" } };

	const stored = await loadBotHistory(bot.id);
	const wallet = new Wallet(input.lid);
	const operationId = crypto.randomUUID();
	const reservedAmount = estimateStaffAgentTurnCost(
		input.message,
		stored.map((entry) => toTextContent(entry.content)).join(" "),
	);

	if (reservedAmount > 0) {
		const reserveResult = await wallet.reserveAtomic({
			amount: reservedAmount,
			description: "staff_agent",
			id: operationId,
		});
		if (!reserveResult.ok) {
			return {
				status: 402 as const,
				body: {
					message: "Insufficient wallet funds for staff agent request",
					code: reserveResult.reason || "INSUFFICIENT_FUNDS",
				},
			};
		}
	}

	const encoder = new TextEncoder();
	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			let finalizationState: "pending" | "settled" | "voided" = "pending";

			const voidReservedHold = async () => {
				if (finalizationState !== "pending") return;
				const voidResult = await wallet.voidAtomic({ ledgerId: operationId });
				if (voidResult.ok) finalizationState = "voided";
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

			const abortSignal = input.request?.signal;
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
				send("start", { ts: Date.now(), message: input.message, locationId: input.lid, botId: bot.id });
				const result = await runAgent({
					lid: input.lid,
					userId: bot.userId,
					botId: bot.id,
					message: input.message,
					mentions,
					send,
					stored,
					memories: bot.memories ?? [],
				});
				if (result.usedModel) await settleReservedBudget(result.cost);
				else await voidReservedHold();
			} catch (error) {
				await voidReservedHold();
				const errorMessage = error instanceof Error ? error.message : "Agent request failed";
				send("error", { message: errorMessage });
			} finally {
				if (abortSignal) abortSignal.removeEventListener("abort", onAbort);
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
}
