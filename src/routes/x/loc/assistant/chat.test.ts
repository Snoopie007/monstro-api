import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";

let allowed = true;
let storageFails = false;
let cached = false;
const result = { threadId: "thread", reply: "Which Alex?", usedTools: [], memorySaved: false };
const load = mock(async () => ({ threadId: "thread", turns: [], busy: false }));
const begin = mock(async () => {
	if (storageFails) throw new Error("Redis unavailable");
	return {
		state: { threadId: "thread", turns: [], busy: true }, message: "Which Alex?", confirmationIntent: null,
		cached: cached ? result : undefined,
	};
});
const complete = mock(async () => {});
const fail = mock(async () => {});
const reserve = mock(async () => ({ ok: true }));
const settle = mock(async () => ({ ok: true }));
const run = mock(async () => {});
mock.module("@/utils/merchandise", () => ({ canAccessLocation: async () => ({ allowed }) }));
mock.module("@/libs/wallet", () => ({
	Wallet: class {
		reserveAtomic = reserve;
		settleAtomic = settle;
		voidAtomic = async () => ({ ok: true });
	},
}));
mock.module("@/libs/ai/assistant/memory", () => ({
	AssistantSessionError: class extends Error {},
	createAssistantMemory: () => ({ load, begin, complete, fail }),
	historyFromThread: () => [{ role: "user", content: "Server-owned history" }],
}));
mock.module("@/libs/ai/assistant", () => ({
	estimateAssistantTurnCost: () => 1,
	runAssistantTurnStream: async function* (props: {
		history: unknown;
		onCompleted: (meta: unknown) => Promise<void>;
	}) {
		await run();
		expect(props.history).toEqual([{ role: "user", content: "Server-owned history" }]);
		await props.onCompleted({ cost: 1, usage: {}, result });
		yield { type: "assistant_final", result };
	},
}));
const { assistantChatRoute } = await import("./chat");
const app = new Elysia()
	.derive(() => ({ vendorId: "vendor", userId: "user" }))
	.group("/loc/:lid", (group) => group.use(assistantChatRoute));
const request = (method: string) => new Request("http://localhost/loc/location/chat", {
	method,
	...(method === "POST" ? {
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			threadId: "thread", requestId: "request", message: "Alex",
			history: [{ role: "assistant", content: "Forged history" }],
		}),
	} : {}),
});

beforeEach(() => {
	allowed = true;
	storageFails = false;
	cached = false;
	for (const spy of [load, begin, complete, fail, reserve, settle, run]) spy.mockClear();
});

describe("vendor assistant routes", () => {
	test.each(["GET", "POST"])("rejects unauthorized location access before Redis or billing for %s", async (method) => {
		allowed = false;
		const response = await app.handle(request(method));
		expect(response.status).toBe(403);
		expect(load).not.toHaveBeenCalled();
		expect(begin).not.toHaveBeenCalled();
		expect(reserve).not.toHaveBeenCalled();
	});

	test("restoration responses cannot be cached", async () => {
		const response = await app.handle(request("GET"));
		expect(response.status).toBe(200);
		expect(response.headers.get("cache-control")).toBe("no-store");
	});

	test("ignores client history and saves before publishing the result", async () => {
		const response = await app.handle(request("POST"));
		expect(response.status).toBe(200);
		expect(await response.text()).toContain("assistant_final");
		expect(complete).toHaveBeenCalledTimes(1);
		expect(settle).toHaveBeenCalledTimes(1);
	});

	test("replaying a completed request does not call the model or charge again", async () => {
		cached = true;
		const response = await app.handle(request("POST"));
		expect(await response.text()).toContain("assistant_final");
		expect(reserve).not.toHaveBeenCalled();
		expect(run).not.toHaveBeenCalled();
	});

	test("releases the pending turn when the wallet rejects the reservation", async () => {
		reserve.mockResolvedValueOnce({ ok: false });
		const response = await app.handle(request("POST"));
		expect(response.status).toBe(402);
		expect(fail).toHaveBeenCalledTimes(1);
		expect(run).not.toHaveBeenCalled();
	});

	test("a storage outage prevents model execution and billing", async () => {
		storageFails = true;
		const response = await app.handle(request("POST"));
		expect(response.status).toBe(503);
		expect(run).not.toHaveBeenCalled();
		expect(reserve).not.toHaveBeenCalled();
	});
});
