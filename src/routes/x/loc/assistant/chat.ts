import { estimateAssistantTurnCost, runAssistantTurnStream } from "@/libs/ai/assistant";
import { AssistantSessionError, createAssistantMemory, historyFromThread } from "@/libs/ai/assistant/memory";
import { Wallet } from "@/libs/wallet";
import { canAccessLocation } from "@/utils/merchandise";
import type { AssistantChatRequest } from "@subtrees/types/assistant";
import type { Context, Elysia } from "elysia";
import { t } from "elysia";

type AssistantContext = Context & { vendorId?: string; userId?: string };

async function authorizedScope(ctx: AssistantContext, locationId: string) {
	if (!ctx.vendorId || !ctx.userId) return null;
	if (!(await canAccessLocation(locationId, ctx.vendorId)).allowed) return null;
	return { locationId, vendorId: ctx.vendorId, userId: ctx.userId };
}

const streamHeaders = {
	"content-type": "text/event-stream; charset=utf-8",
	"cache-control": "no-cache, no-transform",
};

export function assistantChatRoute(app: Elysia) {
	app.get("/chat", async (ctx) => {
		const { lid } = ctx.params as { lid: string };
		const scope = await authorizedScope(ctx as AssistantContext, lid);
		if (!scope) return ctx.status(403, { message: "You cannot access this location's assistant." });
		try {
			const state = await createAssistantMemory().load(scope, ctx.query.threadId);
			ctx.set.headers["cache-control"] = "no-store";
			return { threadId: state.threadId, turns: state.turns, pendingPrompt: state.pendingPrompt, busy: state.busy, interrupted: state.interrupted };
		} catch {
			return ctx.status(503, { message: "Unable to load the conversation. Please try again." });
		}
	}, { query: t.Object({ threadId: t.Optional(t.String({ minLength: 1, maxLength: 120 })) }) });

	app.post("/chat", async (ctx) => {
		const { lid } = ctx.params as { lid: string };
		const scope = await authorizedScope(ctx as AssistantContext, lid);
		if (!scope) return ctx.status(403, { message: "You cannot access this location's assistant." });
		const request = ctx.body as AssistantChatRequest & { requestId: string };
		try {
			const memory = createAssistantMemory();
			const turn = await memory.begin(scope, request);
			if (turn.cached) {
				const event = { type: "assistant_final", threadId: turn.state.threadId, messageId: request.requestId, result: turn.cached, ts: Date.now() };
				return new Response(`event: assistant_final\ndata: ${JSON.stringify(event)}\n\n`, { headers: streamHeaders });
			}
			const history = historyFromThread(turn.state);
			const wallet = new Wallet(lid);
			const operationId = crypto.randomUUID();
			let reserved = false;
			let completed = false;
			let settled = false;
			let executionStarted = false;
			const failTurn = async () => {
				if (reserved && !settled) {
					const result = await wallet.voidAtomic({ ledgerId: operationId });
					if (result.ok) reserved = false;
				}
				if (!completed) await memory.fail(scope, turn.state, executionStarted);
			};
			try {
				const reserve = await wallet.reserveAtomic({
					amount: estimateAssistantTurnCost(turn.message, history),
					description: "assistant_chat", id: operationId,
				});
				if (!reserve.ok) {
					await memory.fail(scope, turn.state);
					return ctx.status(402, { message: "Unable to reserve funds for this assistant request.", code: reserve.reason });
				}
				reserved = true;
			} catch (error) {
				await failTurn();
				throw error;
			}

			const encoder = new TextEncoder();
			let disconnected = false;
			return new Response(new ReadableStream<Uint8Array>({
				cancel() { disconnected = true; },
				async start(controller) {
					executionStarted = true;
					try {
						for await (const event of runAssistantTurnStream({
							...scope, threadId: turn.state.threadId, message: turn.message, history,
							confirmationIntent: turn.confirmationIntent as "confirm" | "cancel" | null,
							confirmedBooking: turn.confirmationIntent ? turn.state.turns.at(-1)?.result.bookingCandidate : undefined,
							onCompleted: async ({ result, cost }) => {
								await memory.complete(scope, turn.state, {
									requestId: request.requestId, message: request.message, contextMessage: turn.message,
									answeredPromptId: request.answer?.promptId, result,
								});
								completed = true;
								const settlement = await wallet.settleAtomic({ ledgerId: operationId, actualAmount: cost });
								settled = settlement.ok;
								if (!settled) throw new Error("Unable to settle the assistant request.");
							},
							onFailed: failTurn,
						})) {
							if (!disconnected && !ctx.request.signal.aborted) {
								controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`));
							}
						}
					} catch (error) {
						console.error("Vendor assistant turn failed", error);
						if (!disconnected && !ctx.request.signal.aborted) {
							controller.enqueue(encoder.encode('event: error\ndata: {"type":"error","message":"Unable to complete the reply. Reload to check the conversation before retrying."}\n\n'));
						}
					} finally {
						if (!disconnected) controller.close();
					}
				},
			}), { headers: streamHeaders });
		} catch (error) {
			if (error instanceof AssistantSessionError) return ctx.status(error.status, { message: error.message });
			console.error("Vendor assistant request failed", error);
			return ctx.status(503, { message: "The assistant is unavailable. Please try again." });
		}
	}, {
		body: t.Object({
			message: t.String({ minLength: 1, maxLength: 4000 }),
			threadId: t.String({ minLength: 1, maxLength: 120 }),
			requestId: t.String({ minLength: 1, maxLength: 120 }),
			answer: t.Optional(t.Object({
				promptId: t.String({ minLength: 1, maxLength: 120 }),
				value: t.String({ minLength: 1, maxLength: 4000 }),
			})),
		}),
	});
	return app;
}
