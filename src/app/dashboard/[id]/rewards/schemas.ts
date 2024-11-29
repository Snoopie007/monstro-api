import { z } from "zod";

export const RewardsSchema = z.object({
    id: z.number().optional(),
    name: z.string(),
    description: z.string(),
    image: z.string(),
    type: z.number(),
    limitPerMember: z.number(),
    rewardPoints: z.number().optional(),
    achievementId: z.number().optional(),
});