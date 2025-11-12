import { integrations } from "@/db/schemas";
import type { Location } from "./location";

export type Integration = typeof integrations.$inferSelect & {
    location?: Location;
}

