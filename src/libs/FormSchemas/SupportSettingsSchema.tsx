import { z } from 'zod'

export const TriggerSchema = z.object({
    id: z.string().optional(),
    name: z
        .string()
        .min(4, { message: 'Name is too short' })
        .max(50, { message: 'Name is too long' }),
    triggerType: z.enum(['keyword', 'intent', 'condition']),
    triggerPhrases: z.array(
        z.object({
            value: z.string(),
        })
    ),
    toolCall: z
        .object({
            tool: z.string(),
            parameters: z.record(z.any()),
        })
        .optional(),
    examples: z.array(
        z.object({
            value: z.string(),
        })
    ),
    requirements: z.array(
        z.object({
            value: z.string(),
        })
    ),
})

export const KnowledgeBaseSchema = z.object({
    qa_entries: z.array(
        z.object({
            id: z.string(),
            question: z
                .string()
                .min(4, { message: 'Question is too short' })
                .max(500, { message: 'Question is too long' }),
            answer: z
                .string()
                .min(4, { message: 'Answer is too short' })
                .max(500, { message: 'Answer is too long' }),
            created: z.string().optional(),
        })
    ),
    document: z
        .object({
            id: z.string().optional(),
            name: z
                .string()
                .min(4, { message: 'Name is too short' })
                .max(50, { message: 'Name is too long' }),
            url: z.string().optional(),
            type: z.enum(['file', 'website']),
        })
        .nullable(),
    // Nullable since document upload is not implemented yet
})

export const SupportSettingsSchema = z.object({
    prompt: z.string().min(10, { message: '' }),
    model: z.enum(['anthropic', 'gpt', 'gemini']),
    temperature: z.coerce.number().min(0).max(1).step(0.1).optional(),
    initialMessage: z.string().optional(),
    persona: z.object({
        avatar: z.string().optional(),
        responseStyle: z.string().optional(),
        personality: z.array(z.string()).optional(),
    }),
})
