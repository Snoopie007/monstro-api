import type { AgentParameters, AgentTone } from "@/types/ai";

export const DEFAULT_AGENT_PARAMETERS: AgentParameters = {
	model: "gpt-4o-mini",
	temperature: 0.6,
	maxTokens: 800,
	topP: 1,
	tone: "professional",
};

export const AVAILABLE_MODELS = [
	{ value: "gpt-4o-mini", label: "gpt-4o-mini" },
	{ value: "gpt-4o", label: "gpt-4o" },
	{ value: "gpt-4.1", label: "gpt-4.1" },
	{ value: "claude-3.5-sonnet", label: "claude-3.5-sonnet" },
] as const;

export const AVAILABLE_TONES: Array<{ value: AgentTone; label: string }> = [
	{ value: "professional", label: "Professional" },
	{ value: "friendly", label: "Friendly" },
	{ value: "concise", label: "Concise" },
	{ value: "playful", label: "Playful" },
] as const;

export const MODEL_LIMITS = {
	temperature: { min: 0, max: 1, step: 0.01 },
	maxTokens: { min: 128, max: 4096, step: 1 },
	topP: { min: 0, max: 1, step: 0.01 },
} as const;
