import { integrations } from "../schemas/integrations";
import type { Location } from "./location";

export type Integration = typeof integrations.$inferSelect & {
    location?: Location;
}

