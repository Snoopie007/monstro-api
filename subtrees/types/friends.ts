import { friends } from "../schemas";
import { Chat } from "./chat";
import { User } from "./user";

export type NewFriend = typeof friends.$inferInsert

export type Friend = typeof friends.$inferSelect & {
    requester: User;
    addressee: User;
    chat?: Chat;
}