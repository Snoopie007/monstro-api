import { pgEnum } from "drizzle-orm/pg-core";

// Drizzle pg enums for database schema
export const assistantStatusEnum = pgEnum("assistant_status", ['draft', 'active', 'paused']);
export const channelEnum = pgEnum("channel", ['WebChat', 'Email', 'System']);
export const messageRoleEnum = pgEnum("message_role", ['user', 'ai', 'vendor', 'system', 'tool', 'tool_response']);
export const triggerTypeEnum = pgEnum("trigger_type", ['keyword', 'intent', 'condition']);
export const botModelEnum = pgEnum("bot_model", ['gpt', 'anthropic', 'gemini']);