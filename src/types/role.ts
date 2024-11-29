export type RoleColor = "default" | "secondary" | "destructive" | "outline" | "red" | "green" | "blue" | "pink" | "cyan" | "lime" | "orange" | "fuchsia" | "sky" | "lemon" | "purple" | "yellow" | null | undefined

export type Permission = {
    name: string;
    description: string;
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
    permissions: string[]
}

