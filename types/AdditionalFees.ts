import type { additionalFees } from "../schemas/AdditionalFees";
import type { Location } from "./location";

export type AdditionalFee = typeof additionalFees.$inferSelect & {
    location?: Location;
};

export type NewAdditionalFee = typeof additionalFees.$inferInsert;
