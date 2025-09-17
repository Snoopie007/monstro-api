import { z } from "zod";


export const SupportBotSchema = z.object({
    name: z.string().min(4, { message: "Name is too short" }).max(50, { message: "Name is too long" }),
    prompt: z.string().min(10, { message: "" }),
    model: z.enum(["anthropic", "gpt", "gemini"]),
    temperature: z.coerce.number().min(0).max(1).step(0.1).optional(),
    initialMessage: z.string().optional(),
    persona: z.object({
        name: z.string().min(4, { message: "Name is too short" }).max(50, { message: "Name is too long" }),
        avatar: z.string().optional(),
        responseStyle: z.string().optional(),
        personality: z.array(z.string()).optional(),
    })
});
