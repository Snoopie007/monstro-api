import { pgEnum } from "drizzle-orm/pg-core";

// Simplified enums for support bot functionality

export enum BotStatus {
  Draft = "Draft",
  Active = "Active",
  Paused = "Paused",
}

export enum Channel {
  WebChat = "WebChat",
  Email = "Email",
  System = "System",
}

export enum MessageRole {
  User = "user",
  AI = "ai",
  Vendor = "vendor",
  System = "system",
  Tool = "tool",
  ToolResponse = "tool_response",
}

export enum BotModel {
  Anthropic = "anthropic",
  GPT = "gpt",
  Gemini = "gemini",
}

export enum DocumentType {
  File = "file",
  Website = "website",
}

export enum TicketStatus {
  Open = "open",
  InProgress = "in_progress",
  Resolved = "resolved",
  Closed = "closed",
}

export enum TriggerType {
  Keyword = "keyword",
  Intent = "intent",
  Condition = "condition",
}

// Drizzle pg enums for database schema
export const botStatusEnum = pgEnum("bot_status", [
  BotStatus.Draft,
  BotStatus.Active,
  BotStatus.Paused,
]);

export const channelEnum = pgEnum("channel", [
  Channel.WebChat,
  Channel.Email,
  Channel.System,
]);

export const messageRoleEnum = pgEnum("message_role", [
  MessageRole.User,
  MessageRole.AI,
  MessageRole.Vendor,
  MessageRole.System,
  MessageRole.Tool,
  MessageRole.ToolResponse,
]);

export const botModelEnum = pgEnum("bot_model", [
  BotModel.Anthropic,
  BotModel.GPT,
  BotModel.Gemini,
]);

export const documentTypeEnum = pgEnum("document_type", [
  DocumentType.File,
  DocumentType.Website,
]);

export const ticketStatusEnum = pgEnum("ticket_status", [
  TicketStatus.Open,
  TicketStatus.InProgress,
  TicketStatus.Resolved,
  TicketStatus.Closed,
]);

export const triggerTypeEnum = pgEnum("trigger_type", [
  TriggerType.Keyword,
  TriggerType.Intent,
  TriggerType.Condition,
]);
