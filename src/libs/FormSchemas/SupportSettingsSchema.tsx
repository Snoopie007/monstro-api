import { z } from "zod";

export const SupportSettingsSchema = z.object({
  prompt: z.string().min(10, { message: "" }),
  model: z.enum(["anthropic", "gpt", "gemini"]),
  temperature: z.coerce.number().min(0).max(1).step(0.1).optional(),
  initialMessage: z.string().optional(),
  persona: z.object({
    name: z
      .string()
      .min(4, { message: "Name is too short" })
      .max(50, { message: "Name is too long" }),
    avatar: z.string().optional(),
    responseStyle: z.string().optional(),
    personality: z.array(z.string()).optional(),
  }),
  triggers: z.array(
    z.object({
      id: z.string().optional(),
      name: z
        .string()
        .min(4, { message: "Name is too short" })
        .max(50, { message: "Name is too long" }),
      triggerType: z.enum(["keyword", "intent", "condition"]),
      triggerPhrases: z.array(z.string()),
      toolCall: z
        .object({
          name: z.string(),
          description: z.string(),
          parameters: z.record(z.any()),
          args: z.record(z.any()),
        })
        .optional(),
      examples: z.array(z.string()),
    })
  ),
  knowledgeBase: z.object({
    qa_entries: z.array(
      z.object({
        id: z.string(),
        question: z
          .string()
          .min(4, { message: "Question is too short" })
          .max(500, { message: "Question is too long" }),
        answer: z
          .string()
          .min(4, { message: "Answer is too short" })
          .max(500, { message: "Answer is too long" }),
        created: z.string(),
      })
    ),
    document: z
      .object({
        id: z.string().optional(),
        name: z
          .string()
          .min(4, { message: "Name is too short" })
          .max(50, { message: "Name is too long" }),
        url: z.string().optional(),
        type: z.enum(["file", "website"]),
      })
      .nullable(),
  }),
});
