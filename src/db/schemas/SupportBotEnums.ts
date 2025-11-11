import { pgEnum } from "drizzle-orm/pg-core";

// Drizzle pg enums for database schema
export const assistantStatusEnum = pgEnum("bot_status", [
  "Active",
  "Draft",
  "Paused",
]);
export const conversationStatusEnum = pgEnum("conversation_status", [
  "open",
  "in_progress",
  "resolved",
  "closed",
]);
export const channelEnum = pgEnum("channel", ["WebChat", "Email", "System"]);
export const messageRoleEnum = pgEnum("message_role", [
  "human",
  "ai",
  "staff",
  "system",
  "tool",
  "tool_message",
  "tool_call",
]);
export const triggerTypeEnum = pgEnum("trigger_type", [
  "keyword",
  "intent",
  "condition",
]);
export const botModelEnum = pgEnum("bot_model", ["gpt", "anthropic", "gemini"]);

// Type aliases for compatibility
export const BotModel = botModelEnum;
export const BotStatus = assistantStatusEnum;
