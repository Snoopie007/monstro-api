"use client";

import React, { useEffect, useRef } from "react";
import { Message } from "@/types/bots";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Bot, User, Loader2, MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/ScrollArea";
import * as chatUtils from "./utils/chatUtils";

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

  const renderMessageIcon = (role: string) => {
    const IconComponent = chatUtils.getMessageIcon(role) === "Bot" ? Bot : User;
    const iconClass = role === "ai" ? "text-primary" : "text-muted-foreground";

    return <IconComponent size={16} className={iconClass} />;
  };

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground max-w-md">
          <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">Start a conversation</p>
          <p className="text-sm">
            Send a message to begin testing your bot. You can ask questions,
            test different scenarios, and see how your bot responds.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
      <div className="space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${chatUtils.getMessageAlignment(
              message.role
            )}`}
          >
            <Avatar className="w-8 h-8 flex-shrink-0">
              <div className="w-full h-full bg-muted flex items-center justify-center">
                {renderMessageIcon(message.role)}
              </div>
            </Avatar>

            <div className="flex-1 space-y-1">
              {/* Message Content */}
              <div
                className={`rounded-lg px-4 py-2 max-w-[80%] ${chatUtils.getMessageBubbleStyle(
                  message.role
                )}`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.content}
                </p>
              </div>

              {/* Message Metadata */}
              <div
                className={`flex items-center gap-2 text-xs text-muted-foreground ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <span>{chatUtils.formatMessageTime(message.createdAt)}</span>
                {message.channel && (
                  <Badge variant="outline" className="text-xs">
                    {message.channel}
                  </Badge>
                )}
                {message.metadata?.error && (
                  <Badge variant="destructive" className="text-xs">
                    Error
                  </Badge>
                )}
                {message.metadata?.processed && (
                  <Badge variant="secondary" className="text-xs">
                    Processed
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Bot size={16} className="text-primary" />
              </div>
            </Avatar>
            <div className="flex-1">
              <div className="bg-muted rounded-lg px-4 py-2 mr-12">
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    Bot is thinking...
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}
