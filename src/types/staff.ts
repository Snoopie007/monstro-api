import { staffs } from "@/db/schemas";
import { Role } from "./role";
import { User } from "./user";

export type Staff = typeof staffs.$inferSelect & {
    user?: User;
    role?: Role;
}
