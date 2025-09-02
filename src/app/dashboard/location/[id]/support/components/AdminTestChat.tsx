"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/ScrollArea";
import {
  Send,
  RotateCcw,
  Bot,
  User,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SupportBot } from "@/types";

interface AdminTestChatProps {
  locationId: string;
  supportBot: SupportBot | null;
  onBotUpdate: (updatedBot: Partial<SupportBot>) => void;
}

interface TestMessage {
  id: string;
  content: string;
  role: "user" | "ai" | "system";
  timestamp: Date;
  metadata?: Record<string, any>;
}

export function AdminTestChat({
  locationId,
  supportBot,
  onBotUpdate,
}: AdminTestChatProps) {
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `test-session-${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize with bot's initial message
  useEffect(() => {
    if (supportBot && messages.length === 0) {
      const initialMessage: TestMessage = {
        id: "initial",
        content:
          supportBot.initialMessage ||
          "Hi! I'm here to help you. What can I assist you with today?",
        role: "ai",
        timestamp: new Date(),
      };
      setMessages([initialMessage]);
    }
  }, [supportBot, messages.length]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !supportBot) return;

    const userMessage: TestMessage = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      role: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // TODO: Implement chat API call to support bot
      // const response = await sendTestMessage(locationId, supportBot.id, {
      //   message: userMessage.content,
      //   sessionId,
      //   messages: [...messages, userMessage]
      // });

      // Simulated response for now
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const aiMessage: TestMessage = {
        id: (Date.now() + 1).toString(),
        content: `I received your message: "${userMessage.content}". This is a test response from the support bot. I would normally process this using the configured AI model and available tools.`,
        role: "ai",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Failed to send test message:", error);
      const errorMessage: TestMessage = {
        id: (Date.now() + 1).toString(),
        content:
          "Sorry, I encountered an error processing your message. Please try again.",
        role: "system",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([]);
    setIsLoading(false);

    // Re-add initial message if bot exists
    if (supportBot) {
      const initialMessage: TestMessage = {
        id: "initial-reset",
        content:
          supportBot.initialMessage ||
          "Hi! I'm here to help you. What can I assist you with today?",
        role: "ai",
        timestamp: new Date(),
      };
      setMessages([initialMessage]);
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
            You
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

  if (!supportBot) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <Bot size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              No Support Bot
            </h3>
            <p className="text-sm text-muted-foreground">
              Configure your support bot to start testing
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
              Admin Test Chat
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {supportBot.status}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetChat}
            disabled={isLoading}
            className="gap-2"
          >
            <RotateCcw size={14} />
            Reset Chat
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Test your support bot configuration • Model: {supportBot.model}
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
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Bot size={16} className="text-green-600" />
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-xs bg-green-50 text-green-700 border-green-200"
                    >
                      Bot
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      typing...
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Loader2
                      size={16}
                      className="animate-spin text-muted-foreground"
                    />
                    <span className="text-sm text-muted-foreground">
                      Processing your message...
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t bg-background p-4">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message to test the support bot..."
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
      </CardContent>
    </Card>
  );
}
