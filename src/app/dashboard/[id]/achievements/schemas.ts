import { z } from "zod";

export const AchievementSchema = z.object({
    id: z.number().optional(),
    name: z.string(),
    badge: z.string(),
    points: z.number(),
    actionCount: z.number(),
    action: z.number(),
    program: z.number()
});