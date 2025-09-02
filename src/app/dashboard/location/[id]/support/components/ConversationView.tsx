"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/ScrollArea";
import {
  Send,
  User,
  Bot,
  HandHeart,
  UserCheck,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SupportBot, SupportConversation } from "@/types/support";

interface ConversationViewProps {
  locationId: string;
  conversation?: SupportConversation;
  supportBot: SupportBot | null;
}

interface ConversationMessage {
  id: string;
  content: string;
  role: "user" | "ai" | "vendor" | "system";
  timestamp: Date;
  metadata?: Record<string, any>;
}

export function ConversationView({
  locationId,
  conversation,
  supportBot,
}: ConversationViewProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVendorTakenOver, setIsVendorTakenOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversation messages
  useEffect(() => {
    const loadConversationMessages = async () => {
      if (!conversation) return;

      try {
        // TODO: Implement conversation messages loading
        // const messages = await getConversationMessages(conversation.id);
        // setMessages(messages);
        // setIsVendorTakenOver(conversation.isVendorActive);

        console.log("TODO: Load conversation messages for", conversation.id);

        // Placeholder messages for demo
        const placeholderMessages: ConversationMessage[] = [
          {
            id: "1",
            content: "Hi! I need help with my membership.",
            role: "user",
            timestamp: new Date(Date.now() - 3600000),
          },
          {
            id: "2",
            content:
              "Hello! I'd be happy to help you with your membership. Could you please tell me what specific information you need?",
            role: "ai",
            timestamp: new Date(Date.now() - 3590000),
          },
          {
            id: "3",
            content:
              "I want to know what classes I can book with my current package.",
            role: "user",
            timestamp: new Date(Date.now() - 3580000),
          },
        ];

        setMessages(placeholderMessages);
        setIsVendorTakenOver(conversation.isVendorActive);
      } catch (error) {
        console.error("Failed to load conversation messages:", error);
      }
    };

    loadConversationMessages();
  }, [conversation]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !conversation) return;

    const message: ConversationMessage = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      role: "vendor", // Vendor is responding
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, message]);
    setInputValue("");
    setIsLoading(true);

    try {
      // TODO: Implement sending vendor message
      // await sendVendorMessage(conversation.id, message.content);
      console.log("TODO: Send vendor message:", message.content);
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTakeOverConversation = async () => {
    if (!conversation) return;

    try {
      // TODO: Implement vendor takeover
      // await takeOverConversation(conversation.id);
      setIsVendorTakenOver(true);
      console.log("TODO: Vendor takeover conversation", conversation.id);

      // Add system message
      const systemMessage: ConversationMessage = {
        id: Date.now().toString(),
        content: "A support agent has joined the conversation.",
        role: "system",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, systemMessage]);
    } catch (error) {
      console.error("Failed to take over conversation:", error);
    }
  };

  const handleHandBackToBot = async () => {
    if (!conversation) return;

    try {
      // TODO: Implement hand back to bot
      // await handBackToBot(conversation.id);
      setIsVendorTakenOver(false);
      console.log("TODO: Hand back to bot", conversation.id);

      // Add system message
      const systemMessage: ConversationMessage = {
        id: Date.now().toString(),
        content: "The conversation has been handed back to the support bot.",
        role: "system",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, systemMessage]);
    } catch (error) {
      console.error("Failed to hand back to bot:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getMessageIcon = (role: string) => {
    switch (role) {
      case "user":
        return <User size={16} className="text-blue-600" />;
      case "ai":
        return <Bot size={16} className="text-green-600" />;
      case "vendor":
        return <UserCheck size={16} className="text-purple-600" />;
      case "system":
        return <MessageSquare size={16} className="text-orange-600" />;
      default:
        return <MessageSquare size={16} className="text-gray-600" />;
    }
  };

  const getMessageBadge = (role: string) => {
    switch (role) {
      case "user":
        return (
          <Badge
            variant="outline"
            className="text-xs bg-blue-50 text-blue-700 border-blue-200"
          >
            Member
          </Badge>
        );
      case "ai":
        return (
          <Badge
            variant="outline"
            className="text-xs bg-green-50 text-green-700 border-green-200"
          >
            Bot
          </Badge>
        );
      case "vendor":
        return (
          <Badge
            variant="outline"
            className="text-xs bg-purple-50 text-purple-700 border-purple-200"
          >
            Agent
          </Badge>
        );
      case "system":
        return (
          <Badge
            variant="outline"
            className="text-xs bg-orange-50 text-orange-700 border-orange-200"
          >
            System
          </Badge>
        );
      default:
        return null;
    }
  };

  if (!conversation) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <MessageSquare
              size={48}
              className="mx-auto mb-4 text-muted-foreground"
            />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              No Conversation Selected
            </h3>
            <p className="text-sm text-muted-foreground">
              Select a conversation from the inbox to view details
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold">
              Member #{conversation.memberId.slice(-6)}
            </CardTitle>
            <Badge
              variant="outline"
              className={`text-xs ${
                isVendorTakenOver
                  ? "bg-purple-50 text-purple-700 border-purple-200"
                  : "bg-green-50 text-green-700 border-green-200"
              }`}
            >
              {isVendorTakenOver ? "Human Agent" : "Support Bot"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {!isVendorTakenOver ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTakeOverConversation}
                className="gap-2"
              >
                <HandHeart size={14} />
                Take Over
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleHandBackToBot}
                className="gap-2"
              >
                <Bot size={14} />
                Hand to Bot
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Started {conversation.createdAt.toLocaleDateString()} •
          {conversation.isVendorActive ? " Agent active" : " Bot handling"}
        </p>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 py-4">
            {messages.map((message) => (
              <div key={message.id} className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    {getMessageIcon(message.role)}
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    {getMessageBadge(message.role)}
                    <span className="text-xs text-muted-foreground">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-sm leading-relaxed">
                    {message.content}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area - Only show if vendor has taken over */}
        {isVendorTakenOver && (
          <div className="border-t bg-background p-4">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your response to the member..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                size="sm"
                className="gap-2"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Send size={16} />
                    Send
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
