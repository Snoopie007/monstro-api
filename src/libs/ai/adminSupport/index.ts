import { desc, eq, sql } from "drizzle-orm";
import { admindb } from "@/db/db";
import {
  adminSupportCaseLogs,
  adminSupportCaseMessages,
  adminSupportCases,
} from "@/db/admin";
import {
  broadcastAdminSupport,
  broadcastAdminSupportCase,
} from "@/libs/broadcast/adminSupport";
import { generate, promptFor, recallDocuments } from "./tools";
import { requestsLiveSupport } from "./utils";

const LOCK_NAMESPACE = 481923;
const MAX_HISTORY = 50;
const NO_DOCUMENTS_REPLY =
  "I couldn’t find an answer to that in our support documentation. You can ask to speak with a human support agent here.";

export async function createAdminSupportAiReply({
  caseId,
  triggerMessageId,
}: {
  caseId: number;
  triggerMessageId: number;
}) {
  const supportCase = await admindb.query.adminSupportCases.findFirst({
    where: (item, operators) => operators.eq(item.id, caseId),
  });

  if (!supportCase || supportCase.status === "closed") return null;

  const metadata = supportCase.metadata;
  const supportMode =
    metadata.supportMode ?? (supportCase.agentId ? "live" : "ai");

  if (
    supportMode !== "ai" ||
    metadata.supportAiPendingMessageId !== triggerMessageId
  ) {
    return null;
  }

  const messages = await admindb.query.adminSupportCaseMessages.findMany({
    where: (item, operators) => operators.eq(item.caseId, caseId),
    orderBy: (item) => [desc(item.created), desc(item.id)],
    limit: MAX_HISTORY,
  });

  const history = messages.slice().reverse();
  const trigger = history.at(-1);

  if (!trigger || trigger.id !== triggerMessageId || trigger.role !== "user") {
    return null;
  }

  const searchText = trigger.content.replace(/\s+/g, " ").trim().slice(0, 500);

  const directEscalation = requestsLiveSupport(trigger.content);
  const documents = directEscalation ? [] : await recallDocuments(searchText);
  const generation = directEscalation
    ? { kind: "escalate" as const }
    : await generate(
        promptFor(supportCase, history, documents),
        Bun.env.SUPPORT_AI_MODEL || "gpt-5.5",
      );
  const content =
    generation.kind === "reply"
      ? documents.length
        ? generation.content
        : NO_DOCUMENTS_REPLY
      : "";

  if (generation.kind === "reply" && !content) return null;

  const result = await admindb.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(${LOCK_NAMESPACE}, ${caseId})`,
    );

    const current = await tx.query.adminSupportCases.findFirst({
      where: (item, operators) => operators.eq(item.id, caseId),
    });

    if (!current || current.status === "closed") return null;

    const currentMetadata = current.metadata;
    const currentMode =
      currentMetadata.supportMode ?? (current.agentId ? "live" : "ai");

    if (
      currentMode !== "ai" ||
      currentMetadata.supportAiPendingMessageId !== triggerMessageId
    ) {
      return null;
    }

    const latest = await tx.query.adminSupportCaseMessages.findFirst({
      where: (item, operators) => operators.eq(item.caseId, caseId),
      orderBy: (item) => [desc(item.created), desc(item.id)],
    });

    if (!latest || latest.id !== triggerMessageId || latest.role !== "user") {
      return null;
    }

    if (generation.kind === "escalate") {
      const [updatedCase] = await tx
        .update(adminSupportCases)
        .set({
          status: "escalated",
          metadata: {
            ...currentMetadata,
            supportMode: "live",
            supportAiPendingMessageId: null,
          },
          updated: new Date(),
        })
        .where(eq(adminSupportCases.id, caseId))
        .returning();
      const [log] = await tx
        .insert(adminSupportCaseLogs)
        .values({
          caseId,
          agentId: null,
          from: current.status,
          to: "escalated",
        })
        .returning();

      if (!updatedCase || !log) {
        throw new Error("Support escalation transaction did not return inserted records");
      }

      return {
        kind: "escalated" as const,
        log,
        updatedCase,
        userId: current.userId,
      };
    }

    const [message] = await tx
      .insert(adminSupportCaseMessages)
      .values({
        caseId,
        agentId: null,
        content,
        attachments: [],
        role: "ai",
        type: "live chat",
      })
      .returning();

    const [updatedCase] = await tx
      .update(adminSupportCases)
      .set({
        metadata: {
          ...currentMetadata,
          supportAiPendingMessageId: null,
        },
        updated: new Date(),
      })
      .where(eq(adminSupportCases.id, caseId))
      .returning();

    if (!message || !updatedCase) {
      throw new Error("Support AI transaction did not return inserted records");
    }

    return {
      kind: "reply" as const,
      message,
      updatedCase,
      userId: current.userId,
    };
  });

  if (!result) return null;

  const broadcasts = [
    broadcastAdminSupportCase(caseId, "case_updated", {
      case: result.updatedCase,
    }),
    broadcastAdminSupport("admin-support:cases:admin", "case_updated", {
      case: result.updatedCase,
    }),
    broadcastAdminSupport(
      `admin-support:cases:user:${result.userId}`,
      "case_updated",
      { case: result.updatedCase },
    ),
  ];
  if (result.kind === "escalated") {
    broadcasts.push(
      broadcastAdminSupportCase(caseId, "case_log", { log: result.log }),
    );
  } else {
    broadcasts.push(
      broadcastAdminSupportCase(caseId, "new_message", {
        message: result.message,
      }),
    );
  }

  await Promise.allSettled(broadcasts);

  return result;
}
