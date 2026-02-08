import type { Location } from "./location";
import { promos } from "subtrees/schemas";

export type Promo = typeof promos.$inferSelect & {
    location?: Location;
};