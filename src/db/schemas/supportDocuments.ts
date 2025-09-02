import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";
import { supportBots } from "./supportBots";
import { documentTypeEnum } from "./SupportBotEnums";

// Documents for support bot knowledge base
export const supportDocuments = pgTable("support_documents", {
  id: text("id")
    .primaryKey()
    .default(sql`uuid_base62()`),
  supportBotId: text("support_bot_id")
    .notNull()
    .references(() => supportBots.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  filePath: text("file_path"),
  url: text("url"),
  type: documentTypeEnum("type").notNull(),
  size: integer("size"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Document chunks for RAG
export const supportDocumentChunks = pgTable("support_document_chunks", {
  id: text("id")
    .primaryKey()
    .default(sql`uuid_base62()`),
  documentId: text("document_id").references(() => supportDocuments.id, {
    onDelete: "cascade",
  }),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 384 }),
});

export type SupportDocument = typeof supportDocuments.$inferSelect;
export type NewSupportDocument = typeof supportDocuments.$inferInsert;
export type SupportDocumentChunk = typeof supportDocumentChunks.$inferSelect;
export type NewSupportDocumentChunk = typeof supportDocumentChunks.$inferInsert;
