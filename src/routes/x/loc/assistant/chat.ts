import { estimateAssistantTurnCost, runAssistantTurnStream } from "@/libs/ai/assistant";
import { Wallet } from "@/libs/wallet";
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

      const wallet = new Wallet(lid);
      const operationId = crypto.randomUUID();
      const reservedAmount = estimateAssistantTurnCost(message, history || []);
      const reserveResult = await wallet.reserveAtomic({
        amount: reservedAmount,
        description: "assistant_chat",
        id: operationId,
      });

      if (!reserveResult.ok) {
        const code = reserveResult.reason || "BUDGET_RESERVE_FAILED";
        if (code === "RECHARGE_FAILED" || code === "RESERVE_EXCEEDS_THRESHOLD" || code === "INSUFFICIENT_FUNDS") {
          return status(402, {
            message: "Insufficient wallet funds for assistant request",
            code,
          });
        }
        return status(500, { message: "Unable to reserve assistant budget", code });
      }

      const encoder = new TextEncoder();
      set.headers["content-type"] = "text/event-stream; charset=utf-8";
      set.headers["cache-control"] = "no-cache, no-transform";
      set.headers.connection = "keep-alive";

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

          const abortSignal = ctx.request?.signal;
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
            for await (const event of runAssistantTurnStream({
              locationId: lid,
              vendorId,
              userId,
              message,
              threadId,
              history,
              onCompleted: ({ cost }) => settleReservedBudget(cost),
              onFailed: voidReservedHold,
            })) {
              const payload = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
              controller.enqueue(encoder.encode(payload));
            }
          } catch (error) {
            await voidReservedHold();
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
