import { beforeEach, describe, expect, mock, test } from "bun:test";
import { AIMessage, AIMessageChunk } from "@langchain/core/messages";
import { z } from "zod";

const invoke = mock(async (_messages: unknown) => new AIMessage("Done."));
const execute = mock(async () => ({ content: JSON.stringify({ ok: true }) }));
const add = mock(async () => ({}));
let chunks: AsyncGenerator<AIMessageChunk> | undefined;
mock.module("@langchain/openai", () => ({
	ChatOpenAI: class { bindTools() { return { stream: async function* (messages: unknown) {
		if (chunks) { yield* chunks; return; }
		const result = await invoke(messages);
		yield new AIMessageChunk({ content: result.content, tool_calls: result.tool_calls });
	} }; } },
	OpenAIEmbeddings: class { async embedQuery() { return []; } },
}));
mock.module("@/queues", () => ({
	assistantMemoryWritebackQueue: { add, getJob: async () => null },
}));
mock.module("@/db/db", () => ({ db: { execute: async () => [] } }));
mock.module("@/libs/ai/AI", () => ({ calculateAICost: () => 1 }));
mock.module("./tools", () => ({
	MAX_TOOL_ITERATIONS: 4, assistantChartBlockSchema: z.any(),
	detectConfirmationIntent: () => null, executeToolCall: execute,
	formatHumanDateInTimezone: (input: string) => input,
	parseToolInput: (input: unknown) => input,
	preferenceSignalScore: () => 0,
	toTextContent: (input: unknown) => typeof input === "string" ? input : "",
	toolDefinitions: [],
}));
const { runAssistantTurn, runAssistantTurnStream } = await import("./index");
const scope = { locationId: "location", vendorId: "vendor", userId: "user", threadId: "thread" };

beforeEach(() => { chunks = undefined; invoke.mockClear(); execute.mockClear(); add.mockReset(); add.mockResolvedValue({}); });

describe("ask_user in the vendor tool loop", () => {
	test("publishes model text before generation and saving finish", async () => {
		let finish = () => {};
		const gate = new Promise<void>((resolve) => { finish = resolve; });
		chunks = (async function* () {
			yield new AIMessageChunk({ content: "Hello " });
			await gate;
			yield new AIMessageChunk({ content: "there." });
		})();
		const completed = mock(async () => {});
		const events = runAssistantTurnStream({ ...scope, message: "Hi", onCompleted: completed });
		expect((await events.next()).value?.type).toBe("session_start");
		expect((await events.next()).value).toMatchObject({ type: "text_delta", delta: "Hello ", index: 0 });
		expect(completed).not.toHaveBeenCalled();
		finish();
		const remaining = [];
		for await (const event of events) remaining.push(event);
		expect(remaining.find((event) => event.type === "assistant_final")).toMatchObject({ result: { reply: "Hello there." } });
	});

	test("cleanup errors do not replace the model failure event", async () => {
		chunks = (async function* () { yield new AIMessageChunk({ content: "Partial" }); throw new Error("Model unavailable"); })();
		const events = [];
		for await (const event of runAssistantTurnStream({
			...scope, message: "Hi", onFailed: async () => { throw new Error("Redis unavailable"); },
		})) events.push(event);
		expect(events.find((event) => event.type === "error")).toMatchObject({ message: "Model unavailable" });
	});

	test("legacy memory queue failure does not discard a generated reply", async () => {
		invoke.mockResolvedValue(new AIMessage("Hello there."));
		add.mockRejectedValue(new Error("Queue unavailable"));
		expect((await runAssistantTurn({ ...scope, message: "Hi" })).reply).toBe("Hello there.");
	});
	test("pauses before other actions in the same model response", async () => {
		invoke.mockResolvedValue(new AIMessage({
			content: "",
			tool_calls: [
				{ id: "book", name: "schedule_manage", args: { action: "create" } },
				{ id: "ask", name: "ask_user", args: { question: "Which Alex?" } },
			],
		}));
		const result = await runAssistantTurn({ ...scope, message: "Book Alex." });
		expect(result.responseState).toBe("ask_clarification");
		expect(result.prompts?.[0]?.question).toBe("Which Alex?");
		expect(result.prompts?.[0]?.blocking).toBe(true);
		expect(result.inputMode).toBe("prompt_only");
		expect(execute).not.toHaveBeenCalled();
		expect(invoke).toHaveBeenCalledTimes(1);
		const writeback = add.mock.calls.find((call: unknown[]) => call[0] === "memory:writeback") as unknown[] | undefined;
		expect(writeback?.[1]).toMatchObject({ toolCalls: [] });
	});

	test("resumes with the server's history and the answer", async () => {
		invoke.mockResolvedValue(new AIMessage("Alex Smith is selected."));
		const result = await runAssistantTurn({
			...scope, message: "Question: Which Alex?\nAnswer: Alex Smith",
			history: [{ role: "user", content: "Find Alex" }, { role: "assistant", content: "Which Alex?" }],
		});
		expect(result.reply).toBe("Alex Smith is selected.");
		const messages = invoke.mock.calls[0]?.[0] as Array<{ content: string }>;
		expect(messages.map((message) => message.content)).toContain("Find Alex");
		expect(messages.at(-1)?.content).toBe("Question: Which Alex?\nAnswer: Alex Smith");
	});

	test("does not publish a final answer if conversation saving fails", async () => {
		invoke.mockResolvedValue(new AIMessage("Done."));
		const failed = mock(async () => {});
		const events = [];
		for await (const event of runAssistantTurnStream({
			...scope, message: "Hello",
			onCompleted: async () => { throw new Error("storage unavailable"); },
			onFailed: failed,
		})) events.push(event);
		expect(events.some((event) => event.type === "assistant_final")).toBe(false);
		expect(events.some((event) => event.type === "error")).toBe(true);
		expect(failed).toHaveBeenCalledTimes(1);
	});
});
