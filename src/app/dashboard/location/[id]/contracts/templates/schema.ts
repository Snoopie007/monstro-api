import { z } from "zod";


export const NewContractSchema = z.object({
    title: z.string().min(1, { message: "Title is required" }),
    description: z.string().optional(),
    type: z.enum(["waiver", "contract"], { message: "Type is required" }),
    requireSignature: z.boolean().default(false),
});

