import type { Location } from "./location";
import { promos } from "@/db/schemas";

export type Promo = typeof promos.$inferSelect & {
    location?: Location;
};