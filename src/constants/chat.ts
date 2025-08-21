import type { Channel } from "@/types/chat";

export const CHANNELS: Array<{ value: Channel; label: string; icon: string }> = [
	{ value: "Chat", label: "Website Chat", icon: "MessageSquare" },
	{ value: "SMS", label: "SMS", icon: "MessageSquare" },
	{ value: "Email", label: "Email", icon: "Mail" },
	{ value: "Facebook", label: "Facebook Messenger", icon: "MessageCircle" },
	{ value: "WhatsApp", label: "WhatsApp", icon: "MessageSquare" },
] as const;

export const MESSAGE_PAGINATION = {
	conversationsLimit: 20,
	messagesLimit: 50,
} as const;

export const UI_CONFIG = {
	conversationListWidth: 320, // w-80 = 20rem = 320px
	inboxSidebarWidth: 256, // w-64 = 16rem = 256px
} as const;
