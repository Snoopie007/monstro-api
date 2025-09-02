/**
 * Custom hook for chat messaging logic
 * Extracts complex messaging business logic from React components
 */

import { useState, useCallback } from "react";
import { Message, UnifiedContact, Bot } from "@/types/bots";
import * as chatApi from "../services/chatApi";
import * as chatUtils from "../utils/chatUtils";

interface NodeTransition {
  from: string;
  to: string;
  reason?: string;
  timestamp: Date;
}

interface ToolCall {
  function: string;
  result: any;
  timestamp: Date;
}

interface ChatMessagingState {
  isLoading: boolean;
  currentNode: string | null;
  nodeTransitions: NodeTransition[];
  toolCalls: ToolCall[];
}

interface ChatMessagingActions {
  sendMessage: (
    content: string,
    bot: Bot,
    sessionId: string | null,
    contact?: UnifiedContact | null
  ) => Promise<Message>;
  resetSession: (bot: Bot, sessionId: string) => Promise<void>;
}

export function useChatMessaging(): ChatMessagingState & ChatMessagingActions {
  const [state, setState] = useState<ChatMessagingState>({
    isLoading: false,
    currentNode: null,
    nodeTransitions: [],
    toolCalls: [],
  });

  const updateState = useCallback((updates: Partial<ChatMessagingState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const sendMessage = useCallback(
    async (
      content: string,
      bot: Bot,
      sessionId: string | null,
      contact?: UnifiedContact | null
    ): Promise<Message> => {
      if (!content.trim()) {
        throw new Error("Message content cannot be empty");
      }

      updateState({ isLoading: true });

      try {
        // Send message to API
        const response = await chatApi.sendMessage(bot.id, {
          message: content.trim(),
          sessionId,
          contactId: contact?.id,
          contactType: contact?.type,
        });

        if (!response.jobId) {
          throw new Error("No job ID returned");
        }

        // Poll for completion
        const result = await chatApi.pollForJobCompletion(
          bot.id,
          response.jobId
        );

        // Update node flow state
        if (result.metadata?.currentNode) {
          updateState({ currentNode: result.metadata.currentNode });
        }

        // Add node transition if available
        if (result.metadata?.nodeTransition) {
          setState((prev) => ({
            ...prev,
            nodeTransitions: [
              ...prev.nodeTransitions,
              {
                ...result.metadata.nodeTransition,
                timestamp: new Date(),
              },
            ],
          }));
        }

        // Add tool calls if available
        if (result.metadata?.toolCalls) {
          setState((prev) => ({
            ...prev,
            toolCalls: [...prev.toolCalls, ...result.metadata.toolCalls],
          }));
        }

        // Create and return bot message
        const botMessage = chatUtils.createBotMessageFromJobResult(
          result,
          bot.id,
          sessionId,
          response.jobId
        );

        return chatUtils.createMessage(botMessage, sessionId);
      } catch (error) {
        console.error("Failed to send message:", error);

        // Create error message
        const errorMessage = chatUtils.createErrorMessage(bot.id);
        return chatUtils.createMessage(errorMessage, sessionId);
      } finally {
        updateState({ isLoading: false });
      }
    },
    [updateState]
  );

  const resetSession = useCallback(
    async (bot: Bot, sessionId: string) => {
      try {
        await chatApi.resetSession(bot.id, sessionId);

        // Reset local state
        updateState({
          currentNode: null,
          nodeTransitions: [],
          toolCalls: [],
        });
      } catch (error) {
        console.error("Failed to reset session:", error);
        // Don't throw - this is a non-critical operation
      }
    },
    [updateState]
  );

  return {
    ...state,
    sendMessage,
    resetSession,
  };
}
