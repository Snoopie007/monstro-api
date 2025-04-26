import { z } from "zod";


export const AIBotSchema = z.object({
    title: z.string().min(4, { message: "Title is too short" }).max(50, { message: "Name is too long" }),
    botName: z.string().min(4, { message: "Bot Name is too short" }).max(50, { message: "Bot Name is too long" }),
    description: z.string().optional(),
    personality: z.array(z.string()),
    responseDetails: z.string().min(10, { message: "" }),
    reason: z.string().min(10, { message: "" }),
    model: z.string().optional(),
    temperature: z.coerce.number().min(0).max(1).optional(),
    maxTokens: z.coerce.number().int().min(100).max(2000).optional(),
    initialMessage: z.string().min(10, { message: "" }).optional(),

});
