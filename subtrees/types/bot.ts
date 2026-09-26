import type { bots, botMessages } from "../schemas/bots";
import type { Location } from "./location";
import type { User } from "./user";

export type BotRole = "vendor" | "staff";

export type BotMessageRole =
	| "human"
	| "ai"
	| "staff"
	| "system"
	| "tool"
	| "tool_message"
	| "tool_call";

export type ToolPayload = {
	ok?: boolean
	status?: string
	kind?: string
	question?: string
	tool?: string
	args?: Record<string, unknown>
};

export type Bot = typeof bots.$inferSelect & {
	user?: User;
	location?: Location;
	messages?: BotMessage[];
};

export type BotMessage = typeof botMessages.$inferSelect & {
	bot?: Bot;
	jsonContent?: ToolPayload;
};

export type NewBot = typeof bots.$inferInsert;
export type NewBotMessage = typeof botMessages.$inferInsert;
