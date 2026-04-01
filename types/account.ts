import { accounts } from "../schemas";
import type { User } from "./user";

export type Account = typeof accounts.$inferSelect & {
    user?: User;
}