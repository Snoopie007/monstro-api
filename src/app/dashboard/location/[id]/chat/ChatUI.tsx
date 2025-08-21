"use client";
import React, { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send, Phone } from "lucide-react";
import { ConversationsProvider, useConversationsContext } from "./ConversationsProvider";
import ConversationsList from "./ConversationsList";
import ChatMessages from "./ChatMessages";

function ChatUIInner({ locationId }: { locationId: string }) {
    return (
        <div className="flex h-full w-full bg-background text-foreground">
            {/* Unified side panel: conversations list only */}
            <div className="border-r border-border flex flex-col bg-card w-[360px] max-w-[420px] min-w-[300px]">
                <div className="p-3 border-b border-border font-semibold flex items-center gap-2"><MessageCircle className="size-4" /> Conversations</div>
                <div className="flex-1 overflow-hidden">
                    <ConversationsList />
                </div>
            </div>

            {/* Messages column */}
            <MessagesPane locationId={locationId} />
        </div>
    );
}

function MessagesPane({ locationId }: { locationId: string }) {
    const { selectedConversation, messages } = useConversationsContext();
    const [draft, setDraft] = useState("");

    function handleSend() {
        if (!selectedConversation || draft.trim().length === 0) return;
        // TODO backend: send message to contact
        console.log("[ChatUI] send message:", { locationId, conversationId: selectedConversation.id, content: draft });
        setDraft("");
    }

    if (!selectedConversation) {
        return <div className="flex-1 grid place-items-center text-muted-foreground">Select a conversation</div>;
    }

    const initials = `${(selectedConversation.firstName ?? "").charAt(0)}${(selectedConversation.lastName ?? "").charAt(0)}`.toUpperCase() || "C";

    return (
        <div className="flex-1 flex flex-col">
            <div className="p-3 border-b border-border flex items-center gap-3 bg-card">
                <Avatar className="h-8 w-8"><AvatarFallback>{initials}</AvatarFallback></Avatar>
                <div className="font-semibold">{selectedConversation.firstName || selectedConversation.lastName || "Untitled Conversation"}</div>
                <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                    <Button size="xs" variant="secondary" onClick={() => console.log("[ChatUI] call contact")}> <Phone className="size-3" /> Call</Button>
                </div>
            </div>
            <ChatMessages messages={messages} contactInitial={initials} />
            <div className="p-3 border-t border-border bg-card flex items-center gap-2">
                <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Type a message..."
                    rows={2}
                    className="flex-1 border border-input bg-background text-foreground placeholder:text-muted-foreground rounded px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button size="sm" onClick={handleSend} className="shrink-0"> <Send className="size-4" /> </Button>
            </div>
        </div>
    );
}

export default function ChatUI({ locationId }: { locationId: string }) {
    return (
        <ConversationsProvider locationId={locationId}>
            <ChatUIInner locationId={locationId} />
        </ConversationsProvider>
    );
}


