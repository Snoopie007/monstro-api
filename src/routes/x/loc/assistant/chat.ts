import { estimateAssistantTurnCost, runAssistantTurnStream } from "@/libs/ai/assistant";
import { refundAIBudgetAtomic, reserveAIBudgetAtomic, settleAIBudgetAtomic } from "@/libs/wallet";
import type { Context, Elysia } from "elysia";
import { t } from "elysia";

export function assistantChatRoute(app: Elysia) {
  app.post(
    "/chat",
    async ({ params, body, status, set, ...ctx }) => {
      const { vendorId, userId } = ctx as Context & { vendorId?: string; userId?: string };
      const { lid } = params as { lid: string };
      const { message, threadId, history } = body as {
        message: string;
        threadId?: string;
        history?: Array<{ role: "user" | "assistant"; content: string }>;
      };

      if (!vendorId || !userId) {
        return status(401, { message: "Unauthorized", code: "UNAUTHORIZED" });
      }

      const operationId = crypto.randomUUID();
      const reservedAmount = estimateAssistantTurnCost(message, history || []);
      const reserveResult = await reserveAIBudgetAtomic({
        lid,
        operationId,
        amount: reservedAmount,
        description: "assistant_chat",
      });

      if (!reserveResult.ok) {
        if (reserveResult.reason === "INSUFFICIENT_FUNDS") {
          return status(402, {
            message: "Insufficient wallet funds for assistant request",
            code: "INSUFFICIENT_FUNDS",
            available: reserveResult.available || 0,
            required: reservedAmount,
          });
        }
        return status(500, { message: "Unable to reserve assistant budget", code: reserveResult.reason || "BUDGET_RESERVE_FAILED" });
      }

      const encoder = new TextEncoder();
      set.headers["content-type"] = "text/event-stream; charset=utf-8";
      set.headers["cache-control"] = "no-cache, no-transform";
      set.headers.connection = "keep-alive";

      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          let finalizationState: "pending" | "settled" | "refunded" = "pending";

          const refundReservedBudget = async () => {
            if (finalizationState !== "pending") return;
            const refundResult = await refundAIBudgetAtomic({
              lid,
              operationId,
              reservedAmount,
              reason: "assistant_chat_failed",
            });
            if (refundResult.ok) {
              finalizationState = "refunded";
            }
          };

          const settleReservedBudget = async (actualAmount: number) => {
            if (finalizationState !== "pending") return;
            const settleResult = await settleAIBudgetAtomic({
              lid,
              operationId,
              reservedAmount,
              actualAmount,
              description: "assistant_chat",
            });
            if (settleResult.ok || typeof settleResult.shortfall === "number") {
              if (typeof settleResult.shortfall === "number" && settleResult.shortfall > 0) {
                console.warn("Assistant wallet shortfall during settlement", {
                  lid,
                  operationId,
                  reservedAmount,
                  actualAmount,
                  shortfall: settleResult.shortfall,
                });
              }
              finalizationState = "settled";
              return;
            }

            await refundReservedBudget();
          };

          const abortSignal = ctx.request?.signal;
          const onAbort = () => {
            void refundReservedBudget();
          };

          if (abortSignal) {
            if (abortSignal.aborted) {
              await refundReservedBudget();
              controller.close();
              return;
            }
            abortSignal.addEventListener("abort", onAbort, { once: true });
          }

          try {
            for await (const event of runAssistantTurnStream({
              locationId: lid,
              vendorId,
              userId,
              message,
              threadId,
              history,
              onCompleted: ({ cost }) => settleReservedBudget(cost),
              onFailed: refundReservedBudget,
            })) {
              const payload = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
              controller.enqueue(encoder.encode(payload));
            }
          } catch (error) {
            await refundReservedBudget();
            const message = error instanceof Error ? error.message : "Failed to process assistant turn";
            const payload = `event: error\ndata: ${JSON.stringify({ type: "error", message, ts: Date.now() })}\n\n`;
            controller.enqueue(encoder.encode(payload));
          } finally {
            if (abortSignal) {
              abortSignal.removeEventListener("abort", onAbort);
            }
            controller.close();
          }
        },
      });

      return new Response(stream);
    },
    {
      body: t.Object({
        message: t.String({ minLength: 1, maxLength: 4000 }),
        threadId: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
        history: t.Optional(t.Array(t.Object({
          role: t.Union([t.Literal("user"), t.Literal("assistant")]),
          content: t.String({ minLength: 1, maxLength: 4000 }),
        }))),
      }),
    },
  );

  return app;
}
