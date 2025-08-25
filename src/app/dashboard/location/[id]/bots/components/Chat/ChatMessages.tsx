"use client";

import React, { useEffect, useRef } from "react";
import { Message } from "@/types/bots";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Bot, User, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/ScrollArea";

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getMessageIcon = (role: string) => {
    switch (role) {
      case "ai":
        return <Bot size={16} className="text-primary" />;
      case "user":
        return <User size={16} className="text-muted-foreground" />;
      default:
        return <User size={16} className="text-muted-foreground" />;
    }
  };

  const getMessageAlignment = (role: string) => {
    return role === "user" ? "flex-row-reverse" : "flex-row";
  };

  const getMessageBubbleStyle = (role: string) => {
    return role === "user"
      ? "bg-primary text-primary-foreground ml-12"
      : "bg-muted mr-12";
  };

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
        <div>
          <Bot size={48} className="mx-auto mb-4 opacity-50" />
          <p>No messages yet</p>
          <p className="text-sm">Start a conversation to test your bot</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full" ref={scrollAreaRef}>
      <div className="space-y-4 py-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${getMessageAlignment(message.role)}`}
          >
            <Avatar className="w-8 h-8 flex items-center justify-center bg-background border">
              {getMessageIcon(message.role)}
            </Avatar>

            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {message.role === "user" ? "You" : "Bot"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(message.createdAt)}
                </span>
                {message.metadata?.scenarioTriggered && (
                  <Badge variant="outline" className="text-xs">
                    Scenario Triggered
                  </Badge>
                )}
                {message.metadata?.error && (
                  <Badge variant="destructive" className="text-xs">
                    Error
                  </Badge>
                )}
              </div>

              <div
                className={`rounded-lg p-3 ${getMessageBubbleStyle(
                  message.role
                )}`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>

              {/* Debug info (only in development) */}
              {process.env.NODE_ENV === "development" && message.metadata && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Debug Info</summary>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                    {JSON.stringify(message.metadata, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <Avatar className="w-8 h-8 flex items-center justify-center bg-background border">
              <Bot size={16} className="text-primary" />
            </Avatar>

            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Bot</span>
                <span className="text-xs text-muted-foreground">
                  thinking...
                </span>
              </div>

              <div className="rounded-lg p-3 bg-muted mr-12">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 size={16} className="animate-spin" />
                  <span>Generating response...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}
