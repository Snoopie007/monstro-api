import { z } from "zod";
import type { AssistantPrompt } from "@subtrees/types/assistant";

export const askUserSchema = z.object({
	question: z.string().trim().min(1).max(500),
	options: z.array(z.object({
		label: z.string().trim().min(1).max(120),
		value: z.string().trim().min(1).max(120),
	})).min(2).max(5).optional(),
}).refine((input) => !input.options || new Set(input.options.map((option) => option.value)).size === input.options.length, {
	message: "Each option must have a unique value.",
});

export function askUser(input: unknown): AssistantPrompt {
	const parsed = askUserSchema.parse(input);
	return {
		id: crypto.randomUUID(),
		kind: parsed.options ? "choice" : "text",
		question: parsed.question,
		options: parsed.options,
		allowCustomAnswer: true,
		required: true,
		risk: "low",
		blocking: true,
		responseChannel: "inline",
	};
}
