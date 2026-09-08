import { afterEach, describe, expect, test } from "bun:test";
import { Redis } from "@upstash/redis";
import { assistantKeys, createAssistantMemory, HISTORY_TTL } from "./memory";
import { askUser } from "./tools/ask";

// Opt in against the local Redis REST bridge. Never run these writes against a shared environment.
const url = process.env.ASSISTANT_REDIS_TEST_URL;
const enabled = !!url && ["localhost", "127.0.0.1"].includes(new URL(url).hostname);
const redis = enabled ? new Redis({ url: url!, token: process.env.ASSISTANT_REDIS_TEST_TOKEN! }) : null;
const cleanup = new Set<string>();
const scope = () => ({ vendorId: `assistant-test-${crypto.randomUUID()}`, userId: "user", locationId: "location" });
function fixture() {
	const owner = scope();
	const keys = assistantKeys(owner, "thread");
	cleanup.add(keys.thread);
	cleanup.add(keys.latest);
	return { owner, keys, memory: createAssistantMemory(redis!) };
}

afterEach(async () => {
	if (redis && cleanup.size) await redis.del(...cleanup);
	cleanup.clear();
});

describe.skipIf(!enabled)("vendor memory against local Redis", () => {
	test("atomically saves and restores a pending question with its expiry", async () => {
		const { owner, keys, memory } = fixture();
		const request = { threadId: "thread", requestId: "request", message: "Find Alex" };
		const turn = await memory.begin(owner, request);
		const prompt = askUser({ question: "Which Alex?" });
		const result = { threadId: "thread", reply: prompt.question, usedTools: [], memorySaved: false, prompts: [prompt] };
		await memory.complete(owner, turn.state, { ...request, result });
		expect((await memory.load(owner)).pendingPrompt).toEqual(prompt);
		expect((await memory.begin(owner, request)).cached).toEqual(result);
		expect(await redis!.ttl(keys.thread)).toBeGreaterThan(HISTORY_TTL - 10);
		expect(await redis!.ttl(keys.latest)).toBeGreaterThan(HISTORY_TTL - 10);
	});

	test("only one concurrent HTTP request claims the turn", async () => {
		const { owner, memory } = fixture();
		const results = await Promise.allSettled([
			memory.begin(owner, { threadId: "thread", requestId: "one", message: "Hello" }),
			memory.begin(owner, { threadId: "thread", requestId: "two", message: "Hello" }),
		]);
		expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
	});

	test("a separate read sees the accepted answer before model completion", async () => {
		const { owner, memory } = fixture();
		const request = { threadId: "thread", requestId: "question", message: "Find Alex" };
		const first = await memory.begin(owner, request);
		const prompt = askUser({ question: "Which Alex?" });
		await memory.complete(owner, first.state, { ...request, result: { threadId: "thread", reply: prompt.question, prompts: [prompt], usedTools: [], memorySaved: false } });
		const accepted = await memory.begin(owner, { ...request, requestId: "answer", message: "Alex Smith", answer: { promptId: prompt.id, value: "Alex Smith" } });
		const restored = await createAssistantMemory(redis!).load(owner);
		expect(restored.pendingPrompt).toBeUndefined();
		expect(restored.turns.at(-1)?.answeredPromptId).toBe(prompt.id);
		expect(restored.turns.at(-1)?.result).toBeUndefined();
		await memory.fail(owner, accepted.state, true);
		expect((await memory.load(owner)).turns.at(-1)?.message).toBe("Alex Smith");
	});
});
