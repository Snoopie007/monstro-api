import { Elysia, t } from "elysia";
import { createAdminSupportAiReply } from "@/libs/ai/adminSupport";

export const supportRoutes = new Elysia({ prefix: "/support" }).post("/cases/:caseId/ai", ({ request, params, body, set }) => {
  const requestContext = {
    caseId: params.caseId,
    triggerMessageId: body.triggerMessageId,
  };
  const token = Bun.env.MONSTRO_API_SERVICE_TOKEN;

  if (!token) {
    console.error("[Admin Support AI] Trigger rejected: service token is not configured", requestContext);
    set.status = 500;
    return { error: "Support AI is not configured" };
  }

  if (request.headers.get("authorization") !== `Bearer ${token}`) {
    console.warn("[Admin Support AI] Trigger rejected: invalid service token", requestContext);
    set.status = 401;
    return { error: "Unauthorized" };
  }

  const caseId = Number(params.caseId);
  if (!Number.isInteger(caseId) || caseId <= 0) {
    console.warn("[Admin Support AI] Trigger rejected: invalid case ID", requestContext);
    set.status = 400;
    return { error: "Invalid case ID" };
  }

  const context = { caseId, triggerMessageId: body.triggerMessageId };
  console.info("[Admin Support AI] Trigger accepted", context);
  set.status = 202;

  void createAdminSupportAiReply(context)
    .then((result) => {
      console.info("[Admin Support AI] Trigger finished", {
        ...context,
        outcome: result?.kind ?? "no_reply",
      });
    })
    .catch((error) => {
      console.error("[Admin Support AI] Unhandled trigger failure", { ...context, error });
    });

  return { accepted: true };
}, { params: t.Object({ caseId: t.String() }), body: t.Object({ triggerMessageId: t.Integer({ minimum: 1 }) }) });
