import { runAssistantTurn } from "@/libs/ai/assistant";
import type { Context, Elysia } from "elysia";
import { t } from "elysia";

export function assistantChatRoute(app: Elysia) {
  app.post(
    "/chat",
    async ({ params, body, status, ...ctx }) => {
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

      try {
        const result = await runAssistantTurn({
          locationId: lid,
          vendorId,
          userId,
          message,
          threadId,
          history,
        });

        return status(200, result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to process assistant turn";
        return status(400, { error: message });
      }
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
