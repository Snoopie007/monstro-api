import { pgTable, text, timestamp, jsonb, boolean, integer } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { members } from "./members";
import { supportAssistants } from "./SupportAssistants";
import { conversationStatusEnum, messageRoleEnum, channelEnum } from "./SupportBotEnums";
import { locations } from "./locations";

export const supportConversations = pgTable("support_conversations", {
  id: text("id").primaryKey().default(sql`uuid_base62()`),
  title: text("title").notNull().default("New Conversation"),
  supportAssistantId: text("support_assistant_id").notNull().references(() => supportAssistants.id, { onDelete: "cascade" }),
  locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  category: text("category"),
  takenOverAt: timestamp("taken_over_at", { withTimezone: true }),
  isVendorActive: boolean("is_vendor_active").default(false),
  description: text("description"),
  status: conversationStatusEnum("status").notNull().default('open'),
  priority: integer("priority").notNull().default(3), // 1=high, 2=medium, 3=low
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated: timestamp("updated_at", { withTimezone: true }),
});

export const supportMessages = pgTable("support_messages", {
  id: text("id").primaryKey().default(sql`uuid_base62()`),
  conversationId: text("conversation_id").notNull().references(() => supportConversations.id, { onDelete: "cascade" }),
  agentName: text("agent_name"),
  agentId: text("agent_id"),
  content: text("content").notNull(),
  role: messageRoleEnum("role").notNull(),
  channel: channelEnum("channel").notNull().default('WebChat'),
  metadata: jsonb("metadata").$type<Record<string, any>>().notNull().default(sql`'{}'::jsonb`),
  created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Define relations
export const supportConversationsRelations = relations(supportConversations, ({ one, many }) => ({
  assistant: one(supportAssistants, {
    fields: [supportConversations.supportAssistantId],
    references: [supportAssistants.id],
  }),
  member: one(members, {
    fields: [supportConversations.memberId],
    references: [members.id],
  }),
  messages: many(supportMessages),
}));

export const supportMessagesRelations = relations(supportMessages, ({ one }) => ({
  conversation: one(supportConversations, {
    fields: [supportMessages.conversationId],
    references: [supportConversations.id],
  }),
}));
