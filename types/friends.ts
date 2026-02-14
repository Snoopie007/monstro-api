import { friends } from "../schemas";
import type { Chat } from "./chat";
import type { User } from "./user";

export type NewFriend = typeof friends.$inferInsert

export type Friend = typeof friends.$inferSelect & {
    requester: User;
    addressee: User;
    chat?: Chat;
}