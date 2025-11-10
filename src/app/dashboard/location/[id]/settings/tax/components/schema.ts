import { z } from "zod";



export const taxRateSchema = z.object({
    name: z.string().min(1, "Name is required"),
    country: z.string().min(1),
    state: z.string().min(1),
    percentage: z.number().min(0).max(100.00),
});


