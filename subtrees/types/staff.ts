import { staffs } from "@subtrees/schemas";
import { staffsLocations } from "../schemas/staffs";
import { Role } from "./vendor/role";
import { User } from "./user";

export type Staff = typeof staffs.$inferSelect & {
    user?: User;
    staffLocations?: StaffLocation[];
}

export type StaffLocation = typeof staffsLocations.$inferSelect & {
    staff?: Staff;
    location?: Location;
    roles?: Role[];
}
