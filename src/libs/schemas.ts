import { z } from "zod";

export const AuthAdditionalDataSchema = z.object({
    migrateId: z.string().optional(),
    ref: z.string().optional(),
    lid: z.string().optional(),
    familyId: z.string().optional(),
});