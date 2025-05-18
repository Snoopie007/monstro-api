export type AdminUser = {
    id?: string
    name?: string
    image?: string | null
    role?: string | null
    phone: string | null
    email: string
    password: string | null
    created: Date
    updated: Date | null
}