import { runAssistantTurnStream } from "@/libs/ai/assistant";
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

      const encoder = new TextEncoder();
      set.headers["content-type"] = "text/event-stream; charset=utf-8";
      set.headers["cache-control"] = "no-cache, no-transform";
      set.headers.connection = "keep-alive";

      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            for await (const event of runAssistantTurnStream({
              locationId: lid,
              vendorId,
              userId,
              message,
              threadId,
              history,
            })) {
              const payload = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
              controller.enqueue(encoder.encode(payload));
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to process assistant turn";
            const payload = `event: error\ndata: ${JSON.stringify({ type: "error", message, ts: Date.now() })}\n\n`;
            controller.enqueue(encoder.encode(payload));
          } finally {
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
