import { integrations } from "@/db/schemas";
import { Location } from "./location";

export type Integration = typeof integrations.$inferSelect & {
    location?: Location;
}

