import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
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
  agentId: text("agent_id"),
  agentName: text("agent_name"),
  metadata: jsonb("metadata")
    .notNull()
    .default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Define relations
export const supportMessagesRelations = relations(supportMessages, ({ one }) => ({
  conversation: one(supportConversations, {
    fields: [supportMessages.conversationId],
    references: [supportConversations.id],
  }),
}));

export type SupportMessage = typeof supportMessages.$inferSelect;
export type NewSupportMessage = typeof supportMessages.$inferInsert;
