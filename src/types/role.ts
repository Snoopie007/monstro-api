export type RoleColor = "default" | "secondary" | "destructive" | "outline" | "red" | "green" | "blue" | "pink" | "cyan" | "lime" | "orange" | "fuchsia" | "sky" | "lemon" | "purple" | "yellow" | null | undefined

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
    color: RoleColor
    staffs?: number
    permissions: Array<string> | Array<RoleHasPermission>
}

export type RoleHasPermission = {
    permissionId: number;
    roleId: number
}

