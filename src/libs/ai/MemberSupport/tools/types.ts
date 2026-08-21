import type { SupportConversation, MemberLocation } from "@subtrees/types";




export interface SupportTool {
	name: string;
	description: string;
	parameters?: Record<string, any>;
	category?: string;
}


export type ToolCall = {
	id?: string;
	name: string;
	args: Record<string, any>;
	type?: "tool_call";
};

export type Context = {
	conversation: SupportConversation;
	ml: MemberLocation;
};
