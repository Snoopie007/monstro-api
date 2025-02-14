import { z } from "zod";

export const AchievementSchema = z.object({
    id: z.number().optional(),
    title: z.string(),
    description: z.string(),
    icon: z.string(),
    badge: z.string(),
    points: z.number(),
    actionCount: z.number(),
    action: z.number(),
    program: z.number()
});