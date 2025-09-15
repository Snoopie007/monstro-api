import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";
import { supportAssistants } from "./SupportAssistants";

// Document chunks for RAG (references support assistant directly)
export const supportDocumentChunks = pgTable("support_document_chunks", {
  id: text("id")
    .primaryKey()
    .default(sql`uuid_base62()`),
  supportAssistantId: text("support_assistant_id")
    .notNull()
    .references(() => supportAssistants.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 384 }),
  chunkIndex: integer("chunk_index").notNull().default(0), // Order of chunks in document
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
