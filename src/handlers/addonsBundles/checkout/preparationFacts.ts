import { z } from "zod";

// Purchase rows have no metadata column. Creation facts use the existing
// billingAttempt key on their subscription roots, including cash drafts.
export const bundlePreparationSchema = z.object({
  checkout: z.object({
    selectedOptionalComponentIds: z.array(z.string()),
    startDate: z.string().nullable(),
  }).optional(),
  initialDownpayment: z.boolean().optional(),
});
