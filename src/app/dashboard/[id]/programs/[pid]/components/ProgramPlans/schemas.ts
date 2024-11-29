import z from 'zod';

export const PlanSchema = z.object({
    name: z.string().min(2, { message: "Required" }),
    description: z.string().min(2, { message: "Required" }),
    programId: z.number().optional(),
    contractId: z.number().optional(),
    vendorId: z.number().optional(),
    family: z.boolean().optional(),
    family_member_limit: z.number().multipleOf(1).lt(100, { message: "Enter a number between 1 and 100." }).optional(),
    pricing: z.object({
        amount: z.number().multipleOf(0.01).gt(1, { message: "Price must be at least $1." }),
        billing_period: z.string().min(2, { message: "Required" }),
    }),
});