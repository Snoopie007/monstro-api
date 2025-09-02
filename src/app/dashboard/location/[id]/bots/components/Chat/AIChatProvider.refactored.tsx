"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Message, UnifiedContact, Bot } from "@/types/bots";
import { useChatMessaging } from "./hooks/useChatMessaging";
import * as chatUtils from "./utils/chatUtils";

interface ChatState {
  messages: Message[];
  selectedContact: UnifiedContact | null;
  selectedBot: Bot | null;
  sessionId: string | null;
}

interface ChatActions {
  addMessage: (
    message: Omit<Message, "id" | "conversationId" | "createdAt">
  ) => void;
  setSelectedContact: (contact: UnifiedContact | null) => void;
  setSelectedBot: (bot: Bot | null) => void;
  sendMessage: (content: string) => Promise<void>;
  resetChat: () => void;
}

type ChatContextType = ChatState &
  ChatActions &
  ReturnType<typeof useChatMessaging>;

const ChatContext = createContext<ChatContextType | null>(null);

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within AIChatProvider");
  }
  return context;
}

interface AIChatProviderProps {
  children: ReactNode;
}

export function AIChatProvider({ children }: AIChatProviderProps) {
  const [state, setState] = useState<ChatState>({
    messages: [],
    selectedContact: null,
    selectedBot: null,
    sessionId: null,
  });

  const messaging = useChatMessaging();

  const addMessage = (
    message: Omit<Message, "id" | "conversationId" | "createdAt">
  ) => {
    const newMessage = chatUtils.createMessage(message, state.sessionId);
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, newMessage],
    }));
  };

  const setSelectedContact = (contact: UnifiedContact | null) => {
    setState((prev) => ({
      ...prev,
      selectedContact: contact,
    }));
  };

  const setSelectedBot = (bot: Bot | null) => {
    setState((prev) => ({
      ...prev,
      selectedBot: bot,
      sessionId: bot ? chatUtils.generateSessionId(bot.id) : null,
    }));

    // Add initial message when bot is selected
    if (bot && bot.initialMessage) {
      setTimeout(() => {
        const initialMessage = chatUtils.createInitialBotMessage(bot);
        addMessage(initialMessage);
      }, 100);
    }
  };

  const sendMessage = async (content: string) => {
    if (!state.selectedBot || !content.trim()) {
      return;
    }

    // Add user message immediately
    const userMessage = chatUtils.createUserMessage(
      content,
      state.selectedContact
    );
    addMessage(userMessage);

    try {
      // Use the messaging hook to handle the complex logic
      const botMessage = await messaging.sendMessage(
        content,
        state.selectedBot,
        state.sessionId,
        state.selectedContact
      );

      // Add the bot response
      addMessage({
        content: botMessage.content,
        role: botMessage.role,
        channel: botMessage.channel,
        metadata: botMessage.metadata,
      });
    } catch (error) {
      // Error handling is done in the hook
      console.error("Failed to send message:", error);
    }
  };

  const resetChat = () => {
    setState((prev) => ({
      ...prev,
      messages: [],
      sessionId: prev.selectedBot
        ? chatUtils.generateSessionId(prev.selectedBot.id)
        : null,
    }));

    // Reset session on server if needed
    if (state.selectedBot && state.sessionId) {
      messaging.resetSession(state.selectedBot, state.sessionId);
    }

    // Re-add initial message if bot is selected
    if (state.selectedBot && state.selectedBot.initialMessage) {
      setTimeout(() => {
        const initialMessage = chatUtils.createInitialBotMessage(
          state.selectedBot!
        );
        addMessage(initialMessage);
      }, 100);
    }
  };

  const contextValue: ChatContextType = {
    ...state,
    ...messaging,
    addMessage,
    setSelectedContact,
    setSelectedBot,
    sendMessage,
    resetChat,
  };

  return (
    <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
  );
}
