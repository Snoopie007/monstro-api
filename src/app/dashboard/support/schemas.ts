import { z } from "zod";






export const SupportFormSchema = z.object({
    category: z.string().min(2, { message: "Required" }),
    subject: z.string().min(4, { message: "Required." }),
    content: z.string().min(10, { message: "Required." }),
    video: z.string().optional()
})