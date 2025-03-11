import { z } from "zod";

export const RewardsSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    description: z.string().min(1, { message: "Description is required" }),
    limitPerMember: z.number().min(1, { message: "Limit per member is required" }),
    totalLimit: z.number().optional(),
    requiredPoints: z.number().min(50, { message: "Required points is required" }),
});