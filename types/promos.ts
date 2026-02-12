import type { Location } from "./location";
import { promos } from "../schemas/promos";

export type Promo = typeof promos.$inferSelect & {
    location?: Location;
};