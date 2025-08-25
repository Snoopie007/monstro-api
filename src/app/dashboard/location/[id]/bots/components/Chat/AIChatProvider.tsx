"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Message, UnifiedContact, Bot } from "@/types/bots";
import { MOCK_UNIFIED_CONTACTS, generateMockChatResponse } from "@/mocks/bots";

interface ChatState {
  messages: Message[];
  selectedContact: UnifiedContact | null;
  selectedBot: Bot | null;
  isLoading: boolean;
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
  setLoading: (loading: boolean) => void;
}

type ChatContextType = ChatState & ChatActions;

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
    selectedContact: MOCK_UNIFIED_CONTACTS[0], // Default to first contact
    selectedBot: null,
    isLoading: false,
    sessionId: null,
  });

  const addMessage = (
    message: Omit<Message, "id" | "conversationId" | "createdAt">
  ) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      conversationId: state.sessionId || "test-session",
      createdAt: new Date(),
      ...message,
    };

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
      sessionId: bot ? `session-${bot.id}-${Date.now()}` : null,
    }));

    // Add initial message when bot is selected
    if (bot && bot.initialMessage) {
      setTimeout(() => {
        addMessage({
          content: bot.initialMessage!,
          role: "ai",
          channel: "WebChat",
          metadata: { botId: bot.id },
        });
      }, 100);
    }
  };

  const setLoading = (loading: boolean) => {
    setState((prev) => ({
      ...prev,
      isLoading: loading,
    }));
  };

  const sendMessage = async (content: string) => {
    if (!state.selectedBot || !content.trim()) {
      return;
    }

    // Add user message
    addMessage({
      content: content.trim(),
      role: "user",
      channel: "WebChat",
      metadata: {
        contactId: state.selectedContact?.id,
        contactType: state.selectedContact?.type,
      },
    });

    setLoading(true);

    try {
      // TODO: Replace with actual streaming API call
      // const response = await fetch(`/api/protected/loc/${locationId}/bots/${state.selectedBot.id}/chat`, {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({
      //         messages: [...state.messages, { role: 'user', content }],
      //         sessionId: state.sessionId,
      //         contactId: state.selectedContact?.id
      //     })
      // });

      // Using mock response for now
      const botResponse = await generateMockChatResponse(
        content,
        state.selectedBot.id
      );

      // Add bot response
      addMessage({
        content: botResponse,
        role: "ai",
        channel: "WebChat",
        metadata: {
          botId: state.selectedBot.id,
          sessionId: state.sessionId,
        },
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      // Add error message
      addMessage({
        content:
          "Sorry, I encountered an error processing your message. Please try again.",
        role: "ai",
        channel: "WebChat",
        metadata: {
          botId: state.selectedBot.id,
          error: true,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    setState((prev) => ({
      ...prev,
      messages: [],
      sessionId: prev.selectedBot
        ? `session-${prev.selectedBot.id}-${Date.now()}`
        : null,
    }));

    // Re-add initial message if bot is selected
    if (state.selectedBot && state.selectedBot.initialMessage) {
      setTimeout(() => {
        addMessage({
          content: state.selectedBot!.initialMessage!,
          role: "ai",
          channel: "WebChat",
          metadata: { botId: state.selectedBot!.id },
        });
      }, 100);
    }
  };

  const contextValue: ChatContextType = {
    ...state,
    addMessage,
    setSelectedContact,
    setSelectedBot,
    sendMessage,
    resetChat,
    setLoading,
  };

  return (
    <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
  );
}
