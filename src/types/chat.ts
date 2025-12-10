import { chatMembers, chats, messages } from "@/db/schemas";
import type { Media } from "./medias";
import type { User } from "./user";


export type Chat = typeof chats.$inferSelect;
export type Message = typeof messages.$inferSelect & {
    medias?: Media[];
}
export type ChatMember = typeof chatMembers.$inferSelect & {
    user?: User;
}
