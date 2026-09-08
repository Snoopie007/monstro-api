import { describe, expect, test } from "bun:test";
import type { AssistantChatResult } from "@subtrees/types/assistant";
import { assistantKeys, createAssistantMemory, HISTORY_TTL, historyFromThread, resolveAnswer } from "./memory";
import { askUser } from "./tools/ask";

function fixture() {
	let now = 0;
	const values = new Map<string, { value: unknown; expires: number }>();
	const client = {
		async get(key: string) {
			const entry = values.get(key);
			return entry && entry.expires > now ? structuredClone(entry.value) : null;
		},
		async eval(_script: string, keys: string[], args: unknown[]) {
			const entry = values.get(keys[0]!);
			const current = entry && entry.expires > now ? entry.value as { revision: number } : null;
			if ((current?.revision || 0) !== args[0]) return 0;
			values.set(keys[0]!, { value: JSON.parse(String(args[1])), expires: now + Number(args[2]) });
			if (args[4] === "1" || values.get(keys[1]!)?.value === args[3]) {
				values.set(keys[1]!, { value: args[3], expires: now + Number(args[2]) });
			}
			return 1;
		},
	};
	const memory = createAssistantMemory(client as Parameters<typeof createAssistantMemory>[0]);
	return { memory, advance: (seconds: number) => { now += seconds; } };
}

const scope = { vendorId: "vendor", userId: "user", locationId: "location" };
const request = { threadId: "thread", requestId: "request", message: "Find Alex" };
const reply = (overrides: Partial<AssistantChatResult> = {}): AssistantChatResult => ({
	threadId: "thread", reply: "Found Alex.", usedTools: [], memorySaved: false, ...overrides,
});

describe("vendor assistant memory", () => {
	test("restores the pending card and resumes its exact question", async () => {
		const { memory } = fixture();
		const prompt = askUser({ question: "Which Alex?", options: [
			{ label: "Alex Smith", value: "smith" }, { label: "Alex Jones", value: "jones" },
		] });
		const started = await memory.begin(scope, request);
		await memory.complete(scope, started.state, {
			...request, result: reply({ reply: prompt.question, prompts: [prompt] }),
		});
		const restored = await memory.load(scope);
		expect(restored.threadId).toBe("thread");
		expect(restored.pendingPrompt).toEqual(prompt);
		const resumed = await memory.begin(scope, {
			...request, requestId: "answer", message: "smith",
			answer: { promptId: prompt.id, value: "smith" },
		});
		expect(resumed.message).toBe("Question: Which Alex?\nAnswer: Alex Smith\nSelected value: smith");
		expect(resumed.confirmationIntent).toBeNull();
		expect(historyFromThread(resumed.state)).toHaveLength(2);
		await memory.complete(scope, resumed.state, {
			requestId: "answer", message: "smith", contextMessage: resumed.message,
			answeredPromptId: prompt.id, result: reply(),
		});
		expect((await memory.load(scope)).pendingPrompt).toBeUndefined();
		await expect(memory.begin(scope, {
			...request, requestId: "stale", answer: { promptId: prompt.id, value: "jones" },
		})).rejects.toThrow("expired or was already answered");
	});

	test("cached request returns its result without starting another turn", async () => {
		const { memory } = fixture();
		const started = await memory.begin(scope, request);
		await memory.complete(scope, started.state, { ...request, result: reply() });
		const replay = await memory.begin(scope, request);
		expect(replay.cached).toEqual(reply());
		expect(replay.state.busy).toBe(false);
	});

	test("isolates users, locations, and vendors even with identical thread IDs", async () => {
		const { memory } = fixture();
		const started = await memory.begin(scope, request);
		await memory.complete(scope, started.state, { ...request, result: reply() });
		for (const other of [
			{ ...scope, userId: "other" }, { ...scope, locationId: "other" }, { ...scope, vendorId: "other" },
		]) {
			expect((await memory.load(other, "thread")).turns).toEqual([]);
			expect((await memory.load(other)).threadId).not.toBe("thread");
		}
		expect(assistantKeys({ ...scope, locationId: "a:b" }, "c")).not.toEqual(assistantKeys({ ...scope, locationId: "a" }, "b:c"));
	});

	test("rejects simultaneous turns and retains failed IDs", async () => {
		const { memory } = fixture();
		const begun = await memory.begin(scope, request);
		await expect(memory.begin(scope, { ...request, requestId: "second" })).rejects.toThrow("still being processed");
		await memory.fail(scope, begun.state);
		await expect(memory.begin(scope, request)).rejects.toThrow("already attempted");
	});

	test("a stale state cannot overwrite a completed turn", async () => {
		const { memory } = fixture();
		const begun = await memory.begin(scope, request);
		await memory.complete(scope, begun.state, { ...request, result: reply() });
		await expect(memory.fail(scope, begun.state)).rejects.toThrow("conversation changed");
		expect((await memory.load(scope)).turns).toHaveLength(1);
	});

	test("finishing an older thread does not replace the user's new chat", async () => {
		const { memory } = fixture();
		const older = await memory.begin(scope, request);
		await memory.begin(scope, { ...request, threadId: "new-thread" });
		await memory.complete(scope, older.state, { ...request, result: reply() });
		expect((await memory.load(scope)).threadId).toBe("new-thread");
	});

	test("only one simultaneous claimant can execute", async () => {
		const { memory } = fixture();
		const results = await Promise.allSettled([
			memory.begin(scope, request),
			memory.begin(scope, { ...request, requestId: "racing" }),
		]);
		expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
	});

	test("an interrupted action requires a new conversation instead of replaying its question", async () => {
		const { memory } = fixture();
		const begun = await memory.begin(scope, request);
		await memory.fail(scope, begun.state, true);
		expect((await memory.load(scope)).interrupted).toBe(true);
		await expect(memory.begin(scope, { ...request, requestId: "new" })).rejects.toThrow("interrupted");
	});

	test("history and latest-thread pointer expire after 24 hours", async () => {
		const { memory, advance } = fixture();
		const begun = await memory.begin(scope, request);
		await memory.complete(scope, begun.state, { ...request, result: reply() });
		advance(HISTORY_TTL + 1);
		expect((await memory.load(scope, "thread")).turns).toEqual([]);
		expect((await memory.load(scope)).threadId).not.toBe("thread");
	});

	test("trims whole turns and rejects replay of a trimmed request", async () => {
		const { memory } = fixture();
		for (let index = 0; index < 25; index++) {
			const next = { ...request, requestId: String(index) };
			const begun = await memory.begin(scope, next);
			await memory.complete(scope, begun.state, { ...next, result: reply() });
		}
		const loaded = await memory.load(scope);
		expect(loaded.turns).toHaveLength(20);
		expect(historyFromThread(loaded)).toHaveLength(40);
		await expect(memory.begin(scope, { ...request, requestId: "0" })).rejects.toThrow("already attempted");
	});

	test("storage outages fail before a turn can execute", async () => {
		const memory = createAssistantMemory({
			get: async () => { throw new Error("offline"); },
		} as unknown as Parameters<typeof createAssistantMemory>[0]);
		await expect(memory.begin(scope, request)).rejects.toMatchObject({ status: 503 });
	});
});

describe("question answers", () => {
	test("does not treat a clarification answer as authorization", () => {
		const prompt = askUser({ question: "What should the report label say?" });
		const resolved = resolveAnswer({ threadId: "thread", turns: [], busy: false, pendingPrompt: prompt }, {
			message: "confirm", answer: { promptId: prompt.id, value: "confirm" },
		});
		expect(resolved.confirmationIntent).toBeNull();
	});

	test("requires a matching pending question and validates options", () => {
		const prompt = askUser({ question: "Which?", options: [{ label: "A", value: "a" }, { label: "B", value: "b" }] });
		const thread = { threadId: "thread", turns: [], busy: false, pendingPrompt: prompt };
		expect(() => resolveAnswer(thread, { message: "a" })).toThrow("current question");
		expect(() => resolveAnswer(thread, { message: "c", answer: { promptId: prompt.id, value: "c" } })).toThrow("available answers");
		expect(() => askUser({ question: "Which?", options: [{ label: "A", value: "a" }, { label: "B", value: "a" }] })).toThrow();
	});
});
