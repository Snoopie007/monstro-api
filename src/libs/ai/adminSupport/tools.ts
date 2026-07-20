import { AIMessage, HumanMessage, SystemMessage, type BaseMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { sql } from "drizzle-orm";
import { admindb } from "@/db/db";
import type { AdminSupportCase, AdminSupportCaseMessage } from "@/db/admin";
import { compactMdx, messageText } from "./utils";

export type Doc = {
  id: number;
  title: string;
  slug: string;
  mdxContent: string;
};

export async function recallDocuments(searchText: string) {
  const documents = await admindb.execute(sql`
    WITH queries AS (
      SELECT plainto_tsquery('english', ${searchText}) AS precise
    ),
    expanded_queries AS (
      SELECT
        precise,
        replace(precise::text, ' & ', ' | ')::tsquery AS broad
      FROM queries
    ),
    documents AS (
      SELECT
        document.id,
        document.title,
        document.slug,
        document.mdx_content AS "mdxContent",
        document.is_pinned,
        document.updated_at,
        document.created_at,
        setweight(to_tsvector('english', coalesce(document.title, '')), 'A')
          || setweight(to_tsvector('english', coalesce(category.name, '')), 'B')
          || setweight(to_tsvector('english', coalesce(document.mdx_content, '')), 'C')
          AS search_vector
      FROM public.support_documents AS document
      JOIN public.support_categories AS category
        ON category.id = document.support_category_id
      WHERE document.status = 'published'
    ),
    ranked AS (
      SELECT
        documents.*,
        search_vector @@ precise AS exact_match,
        ts_rank_cd(search_vector, precise) AS exact_rank,
        ts_rank_cd(search_vector, broad) AS broad_rank
      FROM documents, expanded_queries
      WHERE is_pinned OR search_vector @@ broad
    )
    SELECT id, title, slug, "mdxContent"
    FROM ranked
    WHERE
      is_pinned
      OR exact_match
      OR NOT EXISTS (SELECT 1 FROM ranked WHERE exact_match)
    ORDER BY
      is_pinned DESC,
      exact_match DESC,
      exact_rank DESC,
      broad_rank DESC,
      updated_at DESC NULLS LAST,
      created_at DESC
    LIMIT 5
  `);

  return documents as unknown as Doc[];
}

const escalationTool = {
  type: "function" as const,
  function: {
    name: "escalate_to_live_agent",
    description:
      "Escalate only when the current/latest vendor message itself asks or indicates they want to talk, speak, chat, or connect with a human, person, live agent, support agent, representative, or support teammate. Treat close natural-language variants and misspellings as the same intent. Requests found only in earlier ticket history were already handled and must not trigger escalation.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
};

export async function generate(messages: BaseMessage[], modelName: string) {
  const apiKey = Bun.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const model = new ChatOpenAI({
    model: modelName,
    apiKey,
    maxRetries: 0,
    useResponsesApi: true,
    // This LangChain version does not yet recognize gpt-5.5 as a reasoning model.
    modelKwargs: { reasoning: { effort: "medium" } },
  });
  const response = await model.bindTools([escalationTool]).invoke(
    [
      new SystemMessage(
        "You are Monstro's vendor support AI. Call escalate_to_live_agent only when the final/current vendor message itself asks or indicates they want a human, person, live agent, representative, support agent, or support teammate. Human-support requests in earlier ticket history were already handled and must not trigger another escalation. Otherwise, answer using only the supplied support documents and ticket history. If the documents do not answer the question, say a Monstro support teammate can be requested. Do not invent policy, pricing, legal terms, refunds, or account-specific facts. Do not claim a human has taken an action. Do not close the ticket. Keep the answer concise and helpful.",
      ),
      ...messages,
    ],
    { signal: AbortSignal.timeout(30_000) },
  );

  if (response.tool_calls?.some((toolCall) => toolCall.name === "escalate_to_live_agent")) {
    return { kind: "escalate" as const };
  }

  return { kind: "reply" as const, content: response.text.trim() };
}

export function promptFor(
  supportCase: AdminSupportCase,
  messages: AdminSupportCaseMessage[],
  documents: Doc[],
  currentMessage: AdminSupportCaseMessage,
) {
  const metadata = supportCase.metadata;
  const vendor =
    [metadata.firstName, metadata.lastName].filter(Boolean).join(" ") ||
    "Unknown vendor";

  const docs = documents.length
    ? documents
        .map(
          (doc, i) =>
            `Doc ${i + 1}: ${doc.title}\nSlug: ${doc.slug}\n${compactMdx(doc.mdxContent)}`,
        )
        .join("\n\n")
    : "No matching published support documents were found.";

  return [
    new SystemMessage(
      [
        `Ticket #${100 + supportCase.id}`,
        `Subject: ${supportCase.subject ?? "Unknown"}`,
        `Category: ${supportCase.category ?? "Unknown"}`,
        `Vendor: ${vendor}`,
        `Published support documents:\n${docs}`,
        "The following messages are earlier ticket history. Use them only as context; any human-support requests in them were already handled.",
      ].join("\n\n"),
    ),
    ...messages.map((message) =>
      message.role === "user"
        ? new HumanMessage(messageText(message))
        : new AIMessage(messageText(message)),
    ),
    new SystemMessage(
      "The next HumanMessage is the current vendor message. Reply to it. Only this message may trigger live-support escalation.",
    ),
    new HumanMessage(messageText(currentMessage)),
  ];
}
