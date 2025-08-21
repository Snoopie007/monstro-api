"use client";
import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import type { ChatMessage, ConversationListItem, InboxLite } from "@/types/chat";
import { MOCK_INBOXES, MOCK_CONVERSATIONS, MOCK_MESSAGES } from "@/mocks/chat";

interface ConversationsContextValue {
	locationId: string;
	inboxes: InboxLite[];
	selectedInboxId: string | null;
	setSelectedInboxId: (id: string) => void;
	conversations: ConversationListItem[];
	setConversations: React.Dispatch<React.SetStateAction<ConversationListItem[]>>;
	selectedConversation: ConversationListItem | null;
	setSelectedConversation: (c: ConversationListItem | null) => void;
	messages: ChatMessage[];
	setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

const ConversationsContext = createContext<ConversationsContextValue | undefined>(undefined);

export function useConversationsContext() {
	const ctx = useContext(ConversationsContext);
	if (!ctx) throw new Error("useConversationsContext must be used within ConversationsProvider");
	return ctx;
}

export function ConversationsProvider({
	locationId,
	children,
}: {
	locationId: string;
	children: React.ReactNode;
}) {
	const [inboxes] = useState<InboxLite[]>(MOCK_INBOXES);
	const [selectedInboxId, setSelectedInboxId] = useState<string | null>(inboxes[0]?.id ?? null);
	const [conversations, setConversations] = useState<ConversationListItem[]>(MOCK_CONVERSATIONS);
	const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(conversations[0] ?? null);
	const [messages, setMessages] = useState<ChatMessage[]>([]);

	// Load messages when conversation changes
	useEffect(() => {
		if (selectedConversation) {
			const conversationMessages = MOCK_MESSAGES[selectedConversation.id] ?? [];
			setMessages(conversationMessages);
			// TODO backend: fetch messages for conversation
			// GET /api/conversations/:conversationId/messages
			console.log("[ConversationsProvider] load messages for conversation:", selectedConversation.id);
		} else {
			setMessages([]);
		}
	}, [selectedConversation]);

	const value = useMemo<ConversationsContextValue>(
		() => ({
			locationId,
			inboxes,
			selectedInboxId,
			setSelectedInboxId,
			conversations,
			setConversations,
			selectedConversation,
			setSelectedConversation,
			messages,
			setMessages,
		}),
		[locationId, inboxes, selectedInboxId, conversations, selectedConversation, messages]
	);

	return <ConversationsContext.Provider value={value}>{children}</ConversationsContext.Provider>;
}


