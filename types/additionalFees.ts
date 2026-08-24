import type { additionalFees } from "../schemas/additionalFees";

export type AdditionalFee = typeof additionalFees.$inferSelect;
export type AdditionalFeeType = AdditionalFee["type"];
export type AdditionalFeeCheckoutType = AdditionalFee["checkoutTypes"][number];

export type CheckoutDiscount = {
	type: "fixed_amount" | "percentage";
	value: number;
};
