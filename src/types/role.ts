import { permissions, roleHasPermissions, roles } from "@/db/schemas";
import { Staff } from "./staff";

export type Permission = typeof permissions.$inferSelect
export type PermissionGroup = {
    id?: number;
    name: string;
    permissions: Permission[]
}

export type Role = typeof roles.$inferSelect & {
    permissions: Permission[]
    staffsCount?: number
}

export type RoleHasPermission = typeof roleHasPermissions.$inferSelect
