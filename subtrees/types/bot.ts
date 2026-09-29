import type { botMessages, bots } from "../schemas/bots";
import type { Location } from "./location";
import type { User } from "./user";

type BotSSEPayloads = {
	start: { ts?: number; message?: string; locationId?: string; threadId?: string };
	status: { text?: string };
	tool_start: { id?: string; name?: string };
	clarify: { id?: string; question?: string; options?: BotClarifyOption[] };
	ask: { id?: string; question?: string };
	awaiting_input: { ts?: number; threadId?: string };
	tool_result: { id?: string; name?: string; result?: unknown };
	text_delta: { delta?: string; text?: string; index?: number; ts?: number };
	reply: { text?: string };
	done: { ts?: number; threadId?: string };
	error: { message?: string };
};

export type BOTSSEEvent = {
	[K in keyof BotSSEPayloads]: { event: K; data: BotSSEPayloads[K] };
}[keyof BotSSEPayloads];



export type SessionBookedToolArgs = {
	memberId: string;
	memberName?: string;
	sessionId: string;
	reservationId?: string;
	lid?: string;
};



export type ToolPayload = {
	ok?: boolean
	status?: string
	kind?: string
	question?: string
	tool?: string
	args?: Record<string, unknown>
};

export type BotClarifyOption = {
	id: string
	label: string
}

export type BotClarify = {
	id: string
	question: string
	options: BotClarifyOption[]
}

export type SessionAction = "session-booked" | "session-cancelled";


/** Tool result the agent attaches when a session was booked or cancelled. */
export type BotActionUI = {
	action: SessionAction;
	message: string;
	args: Record<string, unknown>;
};

export type BotToolResult = {
	ui: BotActionUI;
};

export type BotToolCard = {
	id: string;
	action: SessionAction;
	message: string;
	args: Record<string, unknown>;
};

export type BotRole = "vendor" | "staff";
export type BotMessageRole =
	| "human"
	| "ai"
	| "staff"
	| "system"
	| "tool"
	| "tool_message"
	| "tool_call";

export type Bot = typeof bots.$inferSelect & {
	user?: User;
	location?: Location;
	messages?: BotMessage[];
};

export type BotMessage = typeof botMessages.$inferSelect & {
	bot?: Bot;
};

export type NewBot = typeof bots.$inferInsert;
export type NewBotMessage = typeof botMessages.$inferInsert;
