"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Message, UnifiedContact, Bot } from "@/types/bots";

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
    selectedContact: null, // No default contact for now
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
      // Send message to queue-based admin chat endpoint
      const response = await fetch(
        `/api/protected/loc/${window.location.pathname.split("/")[3]}/bots/${
          state.selectedBot.id
        }/admin-chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content.trim(),
            sessionId: state.sessionId,
            contactId: state.selectedContact?.id,
            contactType: state.selectedContact?.type,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();

      // Poll for job completion
      if (data.jobId) {
        await pollForJobCompletion(data.jobId);
      } else {
        throw new Error("No job ID returned");
      }
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

  // Poll for job completion and add bot response
  const pollForJobCompletion = async (jobId: string) => {
    const maxAttempts = 30; // 30 seconds max
    let attempts = 0;

    const poll = async (): Promise<void> => {
      attempts++;

      try {
        const response = await fetch(
          `/api/protected/loc/${window.location.pathname.split("/")[3]}/bots/${
            state.selectedBot!.id
          }/admin-chat?jobId=${jobId}`
        );

        if (!response.ok) {
          throw new Error(`Job status check failed: ${response.status}`);
        }

        const jobData = await response.json();

        if (jobData.status === "completed" && jobData.result) {
          // Job completed successfully
          addMessage({
            content: jobData.result.content,
            role: "ai",
            channel: "WebChat",
            metadata: {
              botId: state.selectedBot!.id,
              sessionId: state.sessionId,
              jobId: jobId,
              processed: true,
            },
          });
          return;
        } else if (jobData.status === "failed") {
          // Job failed
          throw new Error(jobData.failedReason || "Job processing failed");
        } else if (attempts >= maxAttempts) {
          // Timeout
          throw new Error("Job processing timeout");
        } else {
          // Still processing, continue polling
          setTimeout(poll, 1000);
        }
      } catch (error) {
        console.error("Job polling error:", error);
        addMessage({
          content: "Processing failed. Please try again.",
          role: "ai",
          channel: "WebChat",
          metadata: {
            botId: state.selectedBot!.id,
            error: true,
          },
        });
      }
    };

    await poll();
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
