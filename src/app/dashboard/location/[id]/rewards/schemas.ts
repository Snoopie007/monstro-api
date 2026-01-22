import { z } from "zod";

export const RewardsSchema = z.object({
    name: z.string().min(1, { message: " required" }),
    description: z.string().min(1, { message: " required" }),
    limitPerMember: z.number().min(1, { message: "required" }),
    totalLimit: z.string().optional(),
    requiredPoints: z.number().min(50, { message: "required" }),
});