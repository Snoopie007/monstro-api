import type { additionalFees } from "../schemas/AdditionalFees";
import type { Location } from "./location";
import type { FeeCheckoutType, FeeType } from "./DatabaseEnums";


export type AdditionalFee = typeof additionalFees.$inferSelect & {
    location?: Location;
    feeType: FeeType;
    feeCheckoutType: FeeCheckoutType;
};

export type NewAdditionalFee = typeof additionalFees.$inferInsert;
