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
  Lightbulb,
  Copy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SupportAssistant, SupportConversation } from "@/types";
import { toast } from "react-toastify";

interface ConversationViewProps {
  locationId: string;
  conversation?: SupportConversation;
  supportBot: SupportAssistant | null;
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
  const [botSuggestion, setBotSuggestion] = useState<string | null>(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
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
        const response = await fetch(
          `/api/protected/loc/${locationId}/support/conversations/${conversation.id}/messages`
        );

        if (response.ok) {
          const data = await response.json();
          const formattedMessages: ConversationMessage[] = data.messages.map(
            (msg: any) => ({
              id: msg.id,
              content: msg.content,
              role: msg.role,
              timestamp: new Date(msg.createdAt),
              metadata: msg.metadata,
            })
          );
          setMessages(formattedMessages);
        }

        setIsVendorTakenOver(conversation.isVendorActive);
      } catch (error) {
        console.error("Failed to load conversation messages:", error);
        // Fallback to placeholder messages for demo
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
        ];
        setMessages(placeholderMessages);
        setIsVendorTakenOver(conversation.isVendorActive);
      }
    };

    loadConversationMessages();
  }, [conversation, locationId]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !conversation) return;

    const messageContent = inputValue.trim();
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/protected/loc/${locationId}/support/conversations/${conversation.id}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: messageContent,
            role: "vendor",
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const newMessage: ConversationMessage = {
          id: data.message.id,
          content: data.message.content,
          role: data.message.role,
          timestamp: new Date(data.message.createdAt),
          metadata: data.message.metadata,
        };
        setMessages((prev) => [...prev, newMessage]);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      // Re-add the message to input on error
      setInputValue(messageContent);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTakeOverConversation = async () => {
    if (!conversation) return;

    try {
      const response = await fetch(
        `/api/protected/loc/${locationId}/support/conversations/${conversation.id}/takeover`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: "Manual takeover by support agent",
            urgency: "medium",
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setIsVendorTakenOver(true);

        // Add system message
        const systemMessage: ConversationMessage = {
          id: Date.now().toString(),
          content: "A support agent has joined the conversation.",
          role: "system",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, systemMessage]);
        
        // Show success toast
        toast.success("Successfully took over the conversation");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to take over conversation");
      }
    } catch (error) {
      console.error("Failed to take over conversation:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to take over conversation";
      toast.error(errorMessage);
    }
  };

  const handleHandBackToBot = async () => {
    if (!conversation) return;

    try {
      const response = await fetch(
        `/api/protected/loc/${locationId}/support/conversations/${conversation.id}/takeover`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setIsVendorTakenOver(false);
        setBotSuggestion(null); // Clear any bot suggestions

        // Add system message
        const systemMessage: ConversationMessage = {
          id: Date.now().toString(),
          content: "The conversation has been handed back to the support bot.",
          role: "system",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, systemMessage]);
        
        // Show success toast
        toast.success("Successfully handed conversation back to bot");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to hand back conversation");
      }
    } catch (error) {
      console.error("Failed to hand back to bot:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to hand back conversation";
      toast.error(errorMessage);
    }
  };

  const handleGetBotSuggestion = async () => {
    if (!conversation || !supportBot) return;

    setIsLoadingSuggestion(true);
    try {
      const response = await fetch(
        `/api/protected/loc/${locationId}/support/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: messages.map((msg) => ({
              role: msg.role === "ai" ? "ai" : "user",
              content: msg.content,
            })),
            sessionId: `suggestion-${Date.now()}`,
            getSuggestionOnly: true, // Flag to indicate we want a suggestion, not a full chat response
          }),
        }
      );

      if (response.ok) {
        // Handle streaming response for suggestion
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body reader available");

        let suggestionContent = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                setBotSuggestion(suggestionContent);
                setIsLoadingSuggestion(false);
                return;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  suggestionContent += parsed.content;
                }
              } catch (e) {
                // Ignore malformed JSON
              }
            }
          }
        }
      } else {
        throw new Error("Failed to get bot suggestion");
      }
    } catch (error) {
      console.error("Failed to get bot suggestion:", error);
      setBotSuggestion(
        "Sorry, I couldn't generate a suggestion right now. Please try again."
      );
    } finally {
      setIsLoadingSuggestion(false);
    }
  };

  const handleUseSuggestion = () => {
    if (botSuggestion) {
      setInputValue(botSuggestion);
      setBotSuggestion(null);
    }
  };

  const handleCopySuggestion = async () => {
    if (botSuggestion) {
      try {
        await navigator.clipboard.writeText(botSuggestion);
      } catch (error) {
        console.error("Failed to copy suggestion:", error);
      }
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
              {conversation.title || `Member #${conversation.memberId.slice(-6)}`}
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
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGetBotSuggestion}
                  disabled={isLoadingSuggestion}
                  className="gap-2"
                >
                  {isLoadingSuggestion ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Lightbulb size={14} />
                  )}
                  Get Suggestion
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleHandBackToBot}
                  className="gap-2"
                >
                  <Bot size={14} />
                  Hand to Bot
                </Button>
              </>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Started {new Date(conversation.createdAt).toLocaleDateString()} •
          {conversation.isVendorActive ? " Agent active" : " Bot handling"}
        </p>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full px-4">
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
        </div>

        {/* Bot Suggestion Area - Only show if vendor has taken over and there's a suggestion */}
        {isVendorTakenOver && botSuggestion && (
          <div className="flex-shrink-0 border-t bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Lightbulb size={14} className="text-white" />
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                  >
                    Bot Suggestion
                  </Badge>
                </div>
                <div className="text-sm leading-relaxed bg-white border rounded-lg p-3">
                  {botSuggestion}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUseSuggestion}
                    className="gap-2"
                  >
                    <Send size={12} />
                    Use as Response
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopySuggestion}
                    className="gap-2"
                  >
                    <Copy size={12} />
                    Copy
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBotSuggestion(null)}
                    className="text-muted-foreground"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input Area - Only show if vendor has taken over */}
        {isVendorTakenOver && (
          <div className="flex-shrink-0 border-t bg-background p-4">
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
