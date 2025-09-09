import { pgEnum } from "drizzle-orm/pg-core";

// Drizzle pg enums for database schema
export const botStatusEnum = pgEnum("bot_status", ['Draft', 'Active', 'Paused']);
export const channelEnum = pgEnum("channel", ['WebChat', 'Email', 'System']);
export const messageRoleEnum = pgEnum("message_role", ['user', 'ai', 'vendor', 'system', 'tool', 'tool_response']);
export const botModelEnum = pgEnum("bot_model", ['Anthropic', 'GPT', 'Gemini']);
export const documentTypeEnum = pgEnum("document_type", ['File', 'Website']);
export const ticketStatusEnum = pgEnum("ticket_status", ['open', 'in_progress', 'resolved', 'closed']);
export const triggerTypeEnum = pgEnum("trigger_type", ['Keyword', 'Intent', 'Condition']);
