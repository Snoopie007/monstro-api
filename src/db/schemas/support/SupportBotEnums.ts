import { pgEnum } from "drizzle-orm/pg-core";

// Drizzle pg enums for database schema
export const botStatusEnum = pgEnum("bot_status", ['Draft', 'Active', 'Paused']);
export const channelEnum = pgEnum("channel", ['WebChat', 'Email', 'System']);
export const messageRoleEnum = pgEnum("message_role", ['User', 'AI', 'Vendor', 'System', 'Tool', 'ToolResponse']);
export const botModelEnum = pgEnum("bot_model", ['Anthropic', 'GPT', 'Gemini']);
export const documentTypeEnum = pgEnum("document_type", ['File', 'Website']);
export const ticketStatusEnum = pgEnum("ticket_status", ['Open', 'InProgress', 'Resolved', 'Closed']);

// Export TicketStatus enum for easier usage
export enum TicketStatus {
  Open = 'Open',
  InProgress = 'InProgress', 
  Resolved = 'Resolved',
  Closed = 'Closed'
}
export const triggerTypeEnum = pgEnum("trigger_type", ['Keyword', 'Intent', 'Condition']);
