"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Settings,
  MessageSquare,
  User,
  Clock,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/ToolTip";
import { SupportConversation } from "@/types/supportConversations";
import { Badge } from "@/components/ui/badge";
import { useSupportRealtime } from "./hooks/useSupportRealtime";

interface SelectedConversation {
  type: "admin-test" | "member-conversation";
  id: string;
  data?: SupportConversation;
}

interface SupportInboxProps {
  locationId: string;
  conversations: SupportConversation[];
  selectedConversation: SelectedConversation;
  onConversationSelect: (conversation: SelectedConversation) => void;
  onConfigureBot: () => void;
}

export function SupportInbox({
  locationId,
  conversations: initialConversations,
  selectedConversation,
  onConversationSelect,
  onConfigureBot,
}: SupportInboxProps) {
  const [conversations, setConversations] =
    useState<SupportConversation[]>(initialConversations);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationBadges, setNotificationBadges] = useState<Set<string>>(
    new Set()
  );

  // Handle realtime updates
  const handleConversationUpdate = (
    updatedConversation: SupportConversation
  ) => {
    setConversations((prevConversations) =>
      prevConversations.map((conv) =>
        conv.id === updatedConversation.id ? updatedConversation : conv
      )
    );
  };

  const handleVendorActiveChange = (
    conversationId: string,
    isVendorActive: boolean
  ) => {
    if (isVendorActive) {
      setNotificationBadges((prev) => new Set([...prev, conversationId]));
    }
  };

  useSupportRealtime({
    locationId,
    onConversationUpdate: handleConversationUpdate,
    onVendorActiveChange: handleVendorActiveChange,
  });

  // Load conversations from API
  const loadConversations = async () => {
    if (!locationId) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/protected/loc/${locationId}/support/conversations`
      );
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load conversations on mount and when locationId changes
  useEffect(() => {
    loadConversations();
  }, [locationId]);
  const formatLastMessage = (conversation: SupportConversation) => {
    // TODO: Get actual last message from conversation
    return "Last message preview...";
  };

  const formatTime = (date: Date | string) => {
    const now = new Date();
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const diff = now.getTime() - dateObj.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return dateObj.toLocaleDateString();
  };

  const getVendorStatusBadge = (conversation: SupportConversation) => {
    if (conversation.isVendorActive) {
      return (
        <Badge
          variant="outline"
          className="text-xs bg-green-50 text-green-700 border-green-200"
        >
          <User size={10} className="mr-1" />
          Human
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="text-xs bg-blue-50 text-blue-700 border-blue-200"
      >
        <MessageSquare size={10} className="mr-1" />
        Bot
      </Badge>
    );
  };

  return (
    <Card className="h-full border-foreground/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Inbox</CardTitle>
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={loadConversations}
                    disabled={isLoading}
                  >
                    <RefreshCw
                      size={16}
                      className={isLoading ? "animate-spin" : ""}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh conversations</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={onConfigureBot}
                  >
                    <Settings size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Configure bot</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 overflow-y-auto p-0">
        {/* Admin Test Chat - Always first with border bottom */}
        <div
          className={`p-3 cursor-pointer transition-colors border-b border-foreground/10 overflow-hidden ${
            selectedConversation.type === "admin-test"
              ? "bg-primary/5 border-l-4 border-l-primary"
              : "hover:bg-muted/50"
          }`}
          onClick={() => {
            onConversationSelect({
              type: "admin-test",
              id: "admin-test",
            });
          }}
        >
          <div className="flex items-center justify-between mb-2 min-w-0">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <MessageSquare size={14} className="text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-sm truncate">Test Chat</h3>
                <p className="text-xs text-muted-foreground truncate">
                  Admin testing interface
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-xs bg-orange-50 text-orange-700 border-orange-200 flex-shrink-0 ml-2"
            >
              Test
            </Badge>
          </div>
        </div>

        {/* Member Conversations */}
        <div className="px-3 space-y-2">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
              <p>No conversations yet</p>
              <p className="text-sm">Member conversations will appear here</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors overflow-hidden ${
                  selectedConversation.type === "member-conversation" &&
                  selectedConversation.id === conversation.id
                    ? "bg-primary/5 border-l-4 border-l-primary"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => {
                  onConversationSelect({
                    type: "member-conversation",
                    id: conversation.id,
                    data: conversation,
                  });
                  // Clear notification badge when conversation is selected
                  setNotificationBadges((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(conversation.id);
                    return newSet;
                  });
                }}
              >
                <div className="flex items-start justify-between mb-2 min-w-0">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                      <User size={14} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">
                        {conversation.title ||
                          (conversation.member
                            ? `${conversation.member.firstName} ${conversation.member.lastName}`
                            : `Member #${conversation.memberId.slice(-6)}`)}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {conversation.title
                          ? conversation.member
                            ? `${conversation.member.firstName} ${conversation.member.lastName}`
                            : `Member #${conversation.memberId.slice(-6)}`
                          : formatLastMessage(conversation)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                    <div className="flex items-center gap-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                        <Clock size={10} />
                        {formatTime(conversation.createdAt)}
                      </div>
                      {notificationBadges.has(conversation.id) && (
                        <Badge
                          variant="destructive"
                          className="text-xs px-1.5 py-0.5 h-5 animate-pulse whitespace-nowrap"
                        >
                          <AlertTriangle size={10} className="mr-1" />
                          Human
                        </Badge>
                      )}
                    </div>
                    {getVendorStatusBadge(conversation)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
