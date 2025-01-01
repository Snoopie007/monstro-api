import { z } from "zod";

export const RewardsSchema = z.object({
    id: z.number().optional(),
    name: z.string(),
    description: z.string(),
    limitPerMember: z.number(),
    achievementId: z.number().optional(),
    images: z.array(z.string()),
    requiredPoints: z.number().optional(),
    icon: z.string().optional(),
});