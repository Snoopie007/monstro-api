export type Channel = "Chat" | "SMS" | "Email" | "Facebook" | "WhatsApp";
export type MessageRole = "user" | "assistant"; // keep UI-centric

export interface MessageMetadata {
	delivery_status?: "queued" | "sent" | "delivered" | "failed";
	subject?: string; // for email
	[key: string]: unknown;
}

export interface ChatMessage {
	id: string;
	conversationId: string;
	role: MessageRole;
	channel: Channel;
	content: string;
	created: string; // ISO timestamp
	metadata?: MessageMetadata;
	isAI?: boolean; // for role=user messages authored by AI
}

export interface ConversationListItem {
	id: string;
	contactId: string;
	firstName?: string;
	lastName?: string;
	updated?: string; // ISO - last message timestamp
	content?: string; // latest message content
	lastChannel?: Channel; // channel of latest message
}

export interface InboxLite {
	id: string;
	name: string;
}


