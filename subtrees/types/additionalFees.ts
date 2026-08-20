import type { additionalFees } from "../schemas/additionalFees";

export type AdditionalFee = typeof additionalFees.$inferSelect;
export type NewAdditionalFee = typeof additionalFees.$inferInsert;
export type AdditionalFeeType = AdditionalFee["type"];
export type AdditionalFeeCheckoutType = AdditionalFee["checkoutTypes"][number];
