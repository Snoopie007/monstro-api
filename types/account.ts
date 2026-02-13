import { accounts } from "../schemas";
import { User } from "./user";

export type Account = typeof accounts.$inferSelect & {
    user?: User;
}