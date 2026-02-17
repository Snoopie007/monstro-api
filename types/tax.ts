import { taxRates } from "@subtrees/schemas/tax";
import { Location } from "./location";
export type TaxRate = typeof taxRates.$inferSelect & {
    location?: Location;
}

export type NewTaxRate = typeof taxRates.$inferInsert;