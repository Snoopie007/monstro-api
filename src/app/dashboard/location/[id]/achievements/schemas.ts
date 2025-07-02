import { z } from "zod";

export const AchievementSchema = z.object({
    name: z.string(),
    description: z.string(),
    badge: z.string(),
    points: z.number(),
    requiredActionCount: z.number(),
});