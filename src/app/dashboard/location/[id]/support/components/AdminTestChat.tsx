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
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SupportAssistant } from "@/types";
import { useSession } from "next-auth/react";

interface AdminTestChatProps {
  locationId: string;
  supportBot: SupportAssistant | null;
  onBotUpdate: (updatedBot: Partial<SupportAssistant>) => void;
}

interface TestMessage {
  id: string;
  content: string;
  role: "user" | "ai" | "system";
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface TestMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export function AdminTestChat({
  locationId,
  supportBot,
  onBotUpdate,
}: AdminTestChatProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `test-session-${Date.now()}`);
  const [testMembers, setTestMembers] = useState<TestMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load test members for member context testing
  useEffect(() => {
    const loadTestMembers = async () => {
      if (!locationId) return;

      setLoadingMembers(true);
      try {
        const response = await fetch(
          `/api/protected/loc/${locationId}/members?limit=10`
        );
        if (response.ok) {
          const data = await response.json();
          const members = data.members?.slice(0, 10) || [];
          setTestMembers(
            members.map((m: any) => ({
              id: m.id,
              firstName: m.firstName || "Test",
              lastName: m.lastName || "Member",
              email: m.email || "test@example.com",
            }))
          );
        }
      } catch (error) {
        console.error("Failed to load test members:", error);
      } finally {
        setLoadingMembers(false);
      }
    };

    loadTestMembers();
  }, [locationId]);

  // Initialize with bot's initial message
  useEffect(() => {
    if (supportBot && messages.length === 0) {
      const memberContext = selectedMemberId
        ? testMembers.find((m) => m.id === selectedMemberId)
        : null;

      const greeting = memberContext
        ? `Hi ${memberContext.firstName}! I'm here to help you. What can I assist you with today?`
        : supportBot.initialMessage ||
          "Hi! I'm here to help you. What can I assist you with today?";

      const initialMessage: TestMessage = {
        id: "initial",
        content: greeting,
        role: "ai",
        timestamp: new Date(),
      };
      setMessages([initialMessage]);
    }
  }, [supportBot, messages.length, selectedMemberId, testMembers]);

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
      console.log(session?.user);
      // Call the new monstro-api test chat endpoint
      const apiUrl =
        process.env.NEXT_PUBLIC_MONSTRO_API_URL || "http://localhost:3001";
      const response = await fetch(
        `${apiUrl}/api/protected/locations/${locationId}/support/test-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Include auth headers if needed
            Authorization: `Bearer ${session?.user.sbToken || ""}`,
          },
          body: JSON.stringify({
            message: inputValue.trim(), // Send the current message instead of full history
            sessionId,
            testMemberId: selectedMemberId, // Include selected member for context
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `HTTP error! status: ${response.status} - ${
            errorData.error || "Unknown error"
          }`
        );
      }

      // Handle JSON response from new API
      const responseData = await response.json();

      const aiMessage: TestMessage = {
        id: (Date.now() + 1).toString(),
        content:
          responseData.content || "Sorry, I didn't receive a proper response.",
        role: "ai",
        timestamp: new Date(responseData.timestamp || Date.now()),
        metadata: responseData.metadata,
      };

      // Add the AI message to the list
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Failed to send test message:", error);
      const errorMessage: TestMessage = {
        id: (Date.now() + 1).toString(),
        content:
          "Sorry, I encountered an error processing your message. Please check that your support bot is properly configured and try again.",
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
      const memberContext = selectedMemberId
        ? testMembers.find((m) => m.id === selectedMemberId)
        : null;

      const greeting = memberContext
        ? `Hi ${memberContext.firstName}! I'm here to help you. What can I assist you with today?`
        : supportBot.initialMessage ||
          "Hi! I'm here to help you. What can I assist you with today?";

      const initialMessage: TestMessage = {
        id: "initial-reset",
        content: greeting,
        role: "ai",
        timestamp: new Date(),
      };
      setMessages([initialMessage]);
    }
  };

  const handleMemberChange = (memberId: string) => {
    setSelectedMemberId(memberId === "none" ? null : memberId);

    // Reset chat with new member context
    setMessages([]);
    if (supportBot) {
      const memberContext =
        memberId !== "none" ? testMembers.find((m) => m.id === memberId) : null;

      const greeting = memberContext
        ? `Hi ${memberContext.firstName}! I'm here to help you. What can I assist you with today?`
        : supportBot.initialMessage ||
          "Hi! I'm here to help you. What can I assist you with today?";

      const initialMessage: TestMessage = {
        id: "initial-member-change",
        content: greeting,
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
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="flex-shrink-0 pb-3">
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
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Test your support bot configuration • Model: {supportBot.model}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <UserCheck size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium">Test as Member:</span>
          <Select
            value={selectedMemberId || "none"}
            onValueChange={handleMemberChange}
            disabled={loadingMembers}
          >
            <SelectTrigger className="w-[200px] h-8">
              <SelectValue placeholder="Select member..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Member Context</SelectItem>
              {testMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.firstName} {member.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedMemberId && (
            <Badge
              variant="outline"
              className="text-xs bg-blue-50 text-blue-700 border-blue-200"
            >
              Member Context Active
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-4">
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
        </div>

        {/* Input Area - Fixed at bottom */}
        <div className="flex-shrink-0 border-t bg-background p-4">
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
