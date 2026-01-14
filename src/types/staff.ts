import { staffs, staffLocations } from "@/db/schemas";
import { Role } from "./role";
import { User } from "./user";

export type Staff = typeof staffs.$inferSelect & {
    user?: User;
    staffLocations?: StaffLocation[];
}

export type StaffLocation = typeof staffLocations.$inferSelect & {
    staff?: Staff;
    location?: Location;
    roles?: Role[];
}