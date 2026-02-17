import { staffs } from "@subtrees/schemas";
import type { staffsLocations } from "../schemas/staffs";
import type { Role } from "./vendor/role";
import type { User } from "./user";
import type { Location } from "./location";
export type Staff = typeof staffs.$inferSelect & {
    user?: User;
    staffLocations?: StaffLocation[];
}

export type StaffLocation = typeof staffsLocations.$inferSelect & {
    staff?: Staff;
    location?: Location;
    roles?: Role[];
}
