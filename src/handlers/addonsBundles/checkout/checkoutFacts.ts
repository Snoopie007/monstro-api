import { z } from "zod";

// Purchase rows have no metadata column, so a bundle's checkout facts live
// under the bundleCheckout key of each subscription root, including cash drafts.
export const bundleCheckoutSchema = z.object({
  // The optional components and start date this checkout was prepared for.
  checkout: z.object({
    selectedOptionalComponentIds: z.array(z.string()),
    startDate: z.string().nullable(),
  }).optional(),
  // Whether the subscription's first charge was a downpayment, saved when the invoice is created.
  initialDownpayment: z.boolean().optional(),
});
