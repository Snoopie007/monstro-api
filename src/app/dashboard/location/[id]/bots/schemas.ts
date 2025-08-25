import { z } from "zod";

// Bot creation and update schema
export const BotFormSchema = z.object({
  name: z
    .string()
    .min(1, "Bot name is required")
    .max(100, "Bot name must be less than 100 characters"),
  prompt: z
    .string()
    .min(10, "System prompt must be at least 10 characters long"),
  initialMessage: z.string().optional(),
  model: z.enum(["gpt", "anthropic", "gemini"], {
    errorMap: () => ({ message: "Please select a valid AI model" }),
  }),
  temperature: z.number().min(0).max(100),
  status: z.enum(["Draft", "Active", "Pause", "Archived"], {
    errorMap: () => ({ message: "Please select a valid status" }),
  }),
});

// Scenario creation schema
export const ScenarioFormSchema = z.object({
  name: z
    .string()
    .min(1, "Scenario name is required")
    .max(100, "Scenario name must be less than 100 characters"),
  trigger: z
    .string()
    .min(1, "Trigger phrase is required")
    .max(50, "Trigger phrase must be less than 50 characters"),
  examples: z.array(z.string()).min(1, "At least one example is required"),
  requirements: z.array(z.string()).optional(),
  yield: z.boolean().default(false),
});

// Document upload schema
export const DocumentUploadSchema = z
  .object({
    name: z.string().min(1, "Document name is required"),
    type: z.enum(["file", "website"]),
    filePath: z.string().optional(),
    url: z.string().url("Please enter a valid URL").optional(),
  })
  .refine(
    (data) => {
      if (data.type === "file") {
        return !!data.filePath;
      }
      if (data.type === "website") {
        return !!data.url;
      }
      return false;
    },
    {
      message:
        "File path is required for file uploads, URL is required for website documents",
      path: ["filePath"],
    }
  );

// Chat message schema
export const ChatMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(2000, "Message is too long"),
  contactId: z.string().optional(),
  sessionId: z.string().optional(),
});

// Export types
export type BotFormData = z.infer<typeof BotFormSchema>;
export type ScenarioFormData = z.infer<typeof ScenarioFormSchema>;
export type DocumentUploadData = z.infer<typeof DocumentUploadSchema>;
export type ChatMessageData = z.infer<typeof ChatMessageSchema>;
