import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";
import { supportAssistants } from "./SupportAssistants";
import { supportConversations } from "./SupportConversations";

// Support interaction logs
export const supportLogs = pgTable("support_logs", {
  id: text("id").primaryKey().default(sql`uuid_base62()`),
  supportAssistantId: text("support_assistant_id").notNull().references(() => supportAssistants.id, { onDelete: "cascade" }),
  conversationId: text("conversation_id").references(() => supportConversations.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // 'chat', 'tool_call', 'vendor_takeover', etc.
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
