import type { additionalFees } from "../schemas/AdditionalFees";
import type { Location } from "./location";
import type { FeeCheckoutType, FeeType } from "./DatabaseEnums";

export type AdditionalFeeType = FeeType;
export type AdditionalFeeCheckoutType = FeeCheckoutType;

export type AdditionalFee = typeof additionalFees.$inferSelect & {
    location?: Location;
};

export type NewAdditionalFee = typeof additionalFees.$inferInsert;
