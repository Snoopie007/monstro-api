import { adminUsers } from "@/db/admin/AdminUsers";

export type AdminUser = typeof adminUsers.$inferSelect & {
    password: string | null;
}