import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";
import { supportConversations } from "./supportConversations";
import { messageRoleEnum, channelEnum, Channel } from "./SupportBotEnums";

// Messages in support conversations
export const supportMessages = pgTable("support_messages", {
  id: text("id")
    .primaryKey()
    .default(sql`uuid_base62()`),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => supportConversations.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  role: messageRoleEnum("role").notNull(),
  channel: channelEnum("channel").notNull().default(Channel.WebChat),
  metadata: jsonb("metadata")
    .notNull()
    .default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type SupportMessage = typeof supportMessages.$inferSelect;
export type NewSupportMessage = typeof supportMessages.$inferInsert;
