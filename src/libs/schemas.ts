import { z } from "zod";

export const AuthAdditionalDataSchema = z.object({
    migrateId: z.string().nullish().optional(),
    ref: z.string().nullish().optional(),
    lid: z.string().nullish().optional(),
    // familyId: z.string().nullish().optional(),
});