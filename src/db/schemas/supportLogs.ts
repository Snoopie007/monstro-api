import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";
import { supportBots } from "./supportBots";
import { supportConversations } from "./supportConversations";

// Support interaction logs
export const supportLogs = pgTable("support_logs", {
  id: text("id")
    .primaryKey()
    .default(sql`uuid_base62()`),
  supportBotId: text("support_bot_id")
    .notNull()
    .references(() => supportBots.id, { onDelete: "cascade" }),
  conversationId: text("conversation_id").references(
    () => supportConversations.id,
    { onDelete: "cascade" }
  ),
  action: text("action").notNull(), // 'chat', 'tool_call', 'vendor_takeover', etc.
  metadata: jsonb("metadata")
    .notNull()
    .default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type SupportLog = typeof supportLogs.$inferSelect;
export type NewSupportLog = typeof supportLogs.$inferInsert;
