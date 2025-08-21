"use client";
import React, { useMemo, useState } from "react";
import { useConversationsContext } from "./ConversationsProvider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MESSAGE_PAGINATION, UI_CONFIG } from "@/constants/chat";
import { Mail, MessageSquare, MessageCircle } from "lucide-react";

function timeAgo(iso?: string): string {
    if (!iso) return "";
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diffMs / (60 * 1000));
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export default function ConversationsList() {
    const { conversations, selectedConversation, setSelectedConversation, locationId } = useConversationsContext();
    const [showLoadMore, setShowLoadMore] = useState(true);

    const items = useMemo(() => conversations, [conversations]);

    async function loadMore() {
        // TODO backend: fetch more conversations, e.g. GET /api/locations/:id/conversations?offset=n
        console.log("[ConversationsList] load more conversations for", locationId);
        setShowLoadMore(false);
    }

    return (
        <div className="flex flex-col h-full w-full overflow-y-auto bg-card">
            <div className="sticky top-0 z-10 bg-card border-b border-border px-2 py-3 flex flex-row items-center gap-2">
                <input
                    type="text"
                    placeholder="Search conversations..."
                    className="flex-1 min-w-0 h-9 text-sm bg-background text-foreground border border-input rounded px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onChange={(e) => console.log("[ConversationsList] search", e.target.value)}
                />
                <Button size="xs" variant="secondary" onClick={() => console.log("[ConversationsList] new conversation")}>New</Button>
            </div>
            <div className="flex-1 overflow-y-auto">
                {items.length === 0 ? (
                    <div className="text-muted-foreground text-center py-8">No conversations found.</div>
                ) : (
                    items.map((conversation) => {
                        const isSelected = selectedConversation?.id === conversation.id;
                        const avatarFallback = conversation.firstName && conversation.lastName ? `${conversation.firstName.charAt(0).toUpperCase()}${conversation.lastName.charAt(0).toUpperCase()}` : "C";
                        const conversationTitle = conversation.firstName || conversation.lastName || "Untitled Conversation";
                        const timestamp = timeAgo(conversation.updated);
                        const ChannelIcon = getChannelIcon(conversation.lastChannel);
                        return (
                            <div
                                key={conversation.id}
                                onClick={() => setSelectedConversation(conversation)}
                                className={`w-full text-left px-3 py-4 border-b border-border transition-colors ${isSelected ? "bg-muted text-foreground" : "bg-card text-foreground"} hover:bg-muted/80 hover:cursor-pointer`}
                            >
                                <div className="flex flex-row items-center gap-2">
                                    <Avatar className="h-8 w-8 mr-1">
                                        <AvatarFallback className="bg-muted text-muted-foreground">{avatarFallback}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <div className="flex flex-row gap-2 justify-between">
                                            <div className="text-sm truncate" style={{ maxWidth: '60%' }}>{conversationTitle}</div>
                                            <div className="text-xs text-muted-foreground whitespace-nowrap">{timestamp}</div>
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                            <span className="inline-flex items-center justify-center"><ChannelIcon className="size-3" /></span>
                                            <span className="truncate">{conversation.content || "No messages yet."}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                {showLoadMore && items.length >= MESSAGE_PAGINATION.conversationsLimit && (
                    <button
                        type="button"
                        className="w-full py-3 px-6 bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
                        onClick={loadMore}
                    >
                        Load More Conversations
                    </button>
                )}
            </div>
        </div>
    );
}

function getChannelIcon(channel?: string) {
    switch (channel) {
        case "Email":
            return Mail;
        case "Facebook":
            return MessageCircle;
        case "WhatsApp":
        case "SMS":
            return MessageSquare;
        default:
            return MessageSquare;
    }
}


