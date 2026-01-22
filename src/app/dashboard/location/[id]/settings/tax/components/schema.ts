import { z } from "zod";



export const taxRateSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().min(1, "Description is required"),
    country: z.string().min(1),
    state: z.string().min(1),
    percentage: z.number().min(0).max(100),
    inclusive: z.boolean(),
});



export const updateTaxRateSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().min(1, "Description is required"),
});