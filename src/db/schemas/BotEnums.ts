import { pgEnum } from "drizzle-orm/pg-core";

export const botStatus = pgEnum("bot_status", [
  "Draft",
  "Active",
  "Pause",
  "Archived",
]);
export const channel = pgEnum("channel", [
  "SMS",
  "AI",
  "Facebook",
  "Google",
  "WhatsApp",
  "WebChat",
  "Email",
  "Contact",
  "System",
]);
export const messageRole = pgEnum("message_role", [
  "user",
  "ai",
  "contact",
  "system",
  "tool",
  "tool_response",
]);
export const botModel = pgEnum("bot_model", ["anthropic", "gpt", "gemini"]);
export const workflowStatus = pgEnum("workflow_status", [
  "Draft",
  "Active",
  "Pause",
  "Archived",
]);
export const workflowQueueStatus = pgEnum("workflow_queue_status", [
  "Processing",
  "Completed",
  "Failed",
  "Cancelled",
]);
export const documentType = pgEnum("document_type", ["file", "website"]);
