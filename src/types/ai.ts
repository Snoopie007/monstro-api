export type AgentTone = "professional" | "friendly" | "concise" | "playful";

export interface AgentParameters {
	model: string;
	temperature: number;
	maxTokens: number;
	topP: number;
	tone: AgentTone;
}

export interface Agent {
	id: string;
	name: string;
	systemPrompt: string;
	parameters: AgentParameters;
	assignedInboxIds: string[];
	isActive: boolean;
}

export interface Inbox {
	id: string;
	name: string;
}


