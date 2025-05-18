import { z } from "zod";

export const SupportFormSchema = z.object({
    locationId: z.string().min(1, { message: "Required" }),
    category: z.string().min(2, { message: "Required" }),
    subject: z.string().min(4, { message: "Required." }),
    message: z.string().min(10, { message: "Required." }),
    severity: z.enum(["low", "medium", "high", 'urgent']),
    video: z.string().optional()
})