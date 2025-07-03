import { z } from "zod";

export const AchievementSchema = z.object({
    name: z.string(),
    description: z.string(),
    badge: z.string(),
    awardedPoints: z.number(),
    requiredCount: z.number(),

});

export const TriggerSchema = z.object({
    triggerId: z.string(),
    weight: z.number().min(1).max(1000),
    timePeriod: z.number().optional(),
    timePeriodUnit: z.string().optional().default('day'),
    memberPlanId: z.string().optional(),
});
