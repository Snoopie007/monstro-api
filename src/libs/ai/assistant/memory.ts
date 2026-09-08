import { getRedisClient } from "@/libs/redis";
import type { AssistantChatRequest, AssistantHistoryEntry, AssistantStoredTurn, AssistantThread } from "@subtrees/types/assistant";

export const HISTORY_TTL = 24 * 60 * 60;
const MAX_TURNS = 20;
const MAX_HISTORY_CHARS = 64_000;
const MAX_REQUESTS = 200;

export type AssistantScope = { vendorId: string; locationId: string; userId: string };
type ThreadState = AssistantThread & {
	revision: number;
	requests: string[];
	activeRequest?: string;
};
type RedisClient = Pick<ReturnType<typeof getRedisClient>, "get" | "eval">;

export class AssistantSessionError extends Error {
	constructor(message: string, public status: 409 | 503 = 409) {
		super(message);
	}
}

export function assistantKeys(scope: AssistantScope, threadId: string) {
	const owner = [scope.vendorId, scope.locationId, scope.userId].map(encodeURIComponent).join(":");
	return {
		thread: `vendor:assistant:v1:{${owner}}:thread:${encodeURIComponent(threadId)}`,
		latest: `vendor:assistant:v1:{${owner}}:latest`,
	};
}

// A revision check prevents two requests from reading the same pending question
// and both executing its answer. Save the state and expiry together.
const SAVE_STATE = `
local raw = redis.call('GET', KEYS[1])
local revision = 0
if raw then revision = cjson.decode(raw).revision end
if revision ~= tonumber(ARGV[1]) then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
if ARGV[5] == '1' then
  redis.call('SET', KEYS[2], ARGV[4], 'EX', ARGV[3])
elseif redis.call('GET', KEYS[2]) == ARGV[4] then
  redis.call('EXPIRE', KEYS[2], ARGV[3])
end
return 1
`;

export function historyFromThread(thread: AssistantThread): AssistantHistoryEntry[] {
	return thread.turns.flatMap((turn) => [
		{ role: "user" as const, content: turn.contextMessage || turn.message },
		{ role: "assistant" as const, content: turn.result.reply },
	]);
}

export function resolveAnswer(thread: AssistantThread, request: AssistantChatRequest) {
	const pending = thread.pendingPrompt;
	if (!pending) {
		if (request.answer) throw new AssistantSessionError("This question has expired or was already answered. Reload the conversation.");
		return { message: request.message, confirmationIntent: null };
	}
	if (!request.answer || request.answer.promptId !== pending.id) {
		throw new AssistantSessionError("Answer the current question before continuing.");
	}
	const value = request.answer.value.trim();
	if (!value || value.length > 4000) throw new AssistantSessionError("Enter an answer of up to 4,000 characters.");
	if (pending.kind === "confirm") {
		if (value !== "confirm" && value !== "cancel") throw new AssistantSessionError("Choose Confirm or Cancel.");
		return { message: value, confirmationIntent: value };
	}
	const option = pending.options?.find((item) => item.value === value);
	if (pending.kind === "choice" && !option) throw new AssistantSessionError("Choose one of the available answers.");
	const answer = option ? `${option.label}\nSelected value: ${option.value}` : value;
	return { message: `Question: ${pending.question}\nAnswer: ${answer}`, confirmationIntent: null };
}

export function createAssistantMemory(redis: RedisClient = getRedisClient()) {
	async function load(scope: AssistantScope, suppliedThreadId?: string): Promise<ThreadState> {
		try {
			const keys = assistantKeys(scope, suppliedThreadId || "");
			const threadId = suppliedThreadId || await redis.get<string>(keys.latest) || crypto.randomUUID();
			const state = await redis.get<ThreadState>(assistantKeys(scope, threadId).thread);
			return state || { threadId, turns: [], busy: false, revision: 0, requests: [] };
		} catch {
			throw new AssistantSessionError("Conversation storage is unavailable. Please try again.", 503);
		}
	}

	async function save(scope: AssistantScope, state: ThreadState, makeLatest = false) {
		const keys = assistantKeys(scope, state.threadId);
		const next = { ...state, revision: state.revision + 1 };
		let saved: unknown;
		try {
			saved = await redis.eval(SAVE_STATE, [keys.thread, keys.latest], [
				state.revision, JSON.stringify(next), HISTORY_TTL, state.threadId, makeLatest ? "1" : "0",
			]);
		} catch {
			throw new AssistantSessionError("Unable to save the conversation. Reload before sending another message.", 503);
		}
		if (saved !== 1) throw new AssistantSessionError("The conversation changed. Reload before continuing.");
		return next;
	}

	async function begin(scope: AssistantScope, request: AssistantChatRequest & { requestId: string }) {
		const state = await load(scope, request.threadId);
		const cached = state.turns.find((turn) => turn.requestId === request.requestId);
		if (cached) {
			if (cached.message !== request.message || cached.answeredPromptId !== request.answer?.promptId) {
				throw new AssistantSessionError("This request ID belongs to a different message.");
			}
			return { state, cached: cached.result, message: "", confirmationIntent: null };
		}
		if (state.requests.includes(request.requestId)) {
			throw new AssistantSessionError("This request was already attempted. Reload to check its result.");
		}
		if (state.busy) throw new AssistantSessionError("A reply is still being processed. Reload shortly to check its result.");
		if (state.interrupted) throw new AssistantSessionError("This conversation was interrupted. Check the action's result before starting a new chat.");
		if (state.requests.length >= MAX_REQUESTS) throw new AssistantSessionError("This conversation is full. Start a new chat.");
		const answer = resolveAnswer(state, request);
		const next = await save(scope, {
			...state, busy: true, activeRequest: request.requestId,
			requests: [...state.requests, request.requestId],
		}, true);
		return { state: next, cached: undefined, ...answer };
	}

	async function complete(scope: AssistantScope, state: ThreadState, turn: AssistantStoredTurn) {
		const turns = [...state.turns, turn].slice(-MAX_TURNS);
		while (turns.length > 1 && JSON.stringify(turns).length > MAX_HISTORY_CHARS) turns.shift();
		if (JSON.stringify(turns).length > MAX_HISTORY_CHARS) {
			throw new AssistantSessionError("The response was too large to save. Reload before continuing.", 503);
		}
		return save(scope, {
			...state, turns, busy: false, activeRequest: undefined,
			pendingPrompt: turn.result.prompts?.find((prompt) => prompt.blocking),
		});
	}

	async function fail(scope: AssistantScope, state: ThreadState, interrupted = false) {
		// Retain the attempted ID so a network retry cannot repeat a side effect.
		return save(scope, { ...state, busy: false, activeRequest: undefined, interrupted });
	}

	return { load, begin, complete, fail };
}
