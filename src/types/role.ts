import { RoleColor } from "./enums";

export type Permission = {
    name: string;
    description: string;
    id: number
}

export type PermissionGroup = {
    id?: number;
    name: string;
    permissions: Permission[]
}

export type Role = {
    id?: number
    name: string
    color: RoleColor | null
    staffs?: number
    permissions: Permission[] | string[]
}

export type RoleHasPermission = {
    permissionId: number;
    roleId: number
}

