import { integrations } from "subtrees/schemas";
import type { Location } from "./location";

export type Integration = typeof integrations.$inferSelect & {
    location?: Location;
}

