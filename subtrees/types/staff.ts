import { staffs } from "@subtrees/schemas";
import { permissions, roles } from "@subtrees/schemas/permissions";
import { staffsLocations } from "../schemas/staffs";
import { User } from "./user";

export type Permission = typeof permissions.$inferSelect;
export type Role = typeof roles.$inferSelect & {
    permissions: Permission[];
    staffsCount?: number;
};

export type Staff = typeof staffs.$inferSelect & {
    user?: User;
    staffLocations?: StaffLocation[];
}

export type StaffLocation = typeof staffsLocations.$inferSelect & {
    staff?: Staff;
    location?: Location;
    roles?: Role[];
}
