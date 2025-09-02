/**
 * Chat Utilities
 * Pure functions for chat-related business logic
 */

import { Bot, Message, UnifiedContact } from "@/types/bots";

/**
 * Bot status color mapping
 */
export function getBotStatusColor(status: string): string {
  switch (status) {
    case "Active":
      return "bg-green-500";
    case "Draft":
      return "bg-yellow-500";
    case "Pause":
      return "bg-orange-500";
    case "Archived":
      return "bg-gray-500";
    default:
      return "bg-gray-500";
  }
}

/**
 * Filters bots by their status
 */
export function filterAvailableBots(bots: Bot[]): Bot[] {
  return bots.filter(
    (bot) => bot.status === "Active" || bot.status === "Draft"
  );
}

/**
 * Selects the best bot from available bots
 * Priority: Active status, then first available
 */
export function selectBestBot(bots: Bot[]): Bot | null {
  if (bots.length === 0) return null;

  return bots.find((bot) => bot.status === "Active") || bots[0];
}

/**
 * Generates a unique session ID for a bot
 */
export function generateSessionId(botId: string): string {
  return `session-${botId}-${Date.now()}`;
}

/**
 * Generates a unique message ID
 */
export function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random()}`;
}

/**
 * Formats a date for chat message display
 */
export function formatMessageTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Gets the appropriate icon component name for a message role
 */
export function getMessageIcon(role: string): "Bot" | "User" {
  switch (role) {
    case "ai":
      return "Bot";
    case "user":
      return "User";
    default:
      return "User";
  }
}

/**
 * Determines message alignment based on role
 */
export function getMessageAlignment(
  role: string
): "flex-row" | "flex-row-reverse" {
  return role === "user" ? "flex-row-reverse" : "flex-row";
}

/**
 * Gets CSS classes for message bubble styling
 */
export function getMessageBubbleStyle(role: string): string {
  return role === "user"
    ? "bg-primary text-primary-foreground ml-12"
    : "bg-muted mr-12";
}

/**
 * Creates a complete message object from partial data
 */
export function createMessage(
  partialMessage: Omit<Message, "id" | "conversationId" | "createdAt">,
  sessionId: string | null
): Message {
  return {
    id: generateMessageId(),
    conversationId: sessionId || "test-session",
    createdAt: new Date(),
    ...partialMessage,
  };
}

/**
 * Creates initial bot message when a bot is selected
 */
export function createInitialBotMessage(
  bot: Bot
): Omit<Message, "id" | "conversationId" | "createdAt"> {
  return {
    content: bot.initialMessage!,
    role: "ai",
    channel: "WebChat",
    metadata: { botId: bot.id },
  };
}

/**
 * Creates error message for failed operations
 */
export function createErrorMessage(
  botId: string,
  content: string = "Sorry, I encountered an error processing your message. Please try again."
): Omit<Message, "id" | "conversationId" | "createdAt"> {
  return {
    content,
    role: "ai",
    channel: "WebChat",
    metadata: {
      botId,
      error: true,
    },
  };
}

/**
 * Creates user message from input
 */
export function createUserMessage(
  content: string,
  contact?: UnifiedContact | null
): Omit<Message, "id" | "conversationId" | "createdAt"> {
  return {
    content: content.trim(),
    role: "user",
    channel: "WebChat",
    metadata: {
      contactId: contact?.id,
      contactType: contact?.type,
    },
  };
}

/**
 * Processes job result and creates bot message
 */
export function createBotMessageFromJobResult(
  result: any,
  botId: string,
  sessionId: string | null,
  jobId: string
): Omit<Message, "id" | "conversationId" | "createdAt"> {
  return {
    content: result.content,
    role: "ai",
    channel: "WebChat",
    metadata: {
      botId,
      sessionId,
      jobId,
      currentNode: result.metadata?.currentNode,
      processed: true,
    },
  };
}
