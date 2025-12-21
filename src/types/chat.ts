import { chatMembers, chats, messages } from "@/db/schemas";
import type { Media } from "./medias";
import type { User } from "./user";


export type Chat = typeof chats.$inferSelect;
export type Message = typeof messages.$inferSelect & {
    medias?: Media[];
    reply?: MessageReply;
    sender?: MessageSender;
}

export type MessageSender = Omit<User, 'password' | 'email' | 'emailVerified' | 'created' | 'updated'>;

export type MessageReply = {
    id: string;
    senderId: string;
    content: string | null;
    sender?: MessageSender;
}


export type ChatMember = typeof chatMembers.$inferSelect & {
    user?: User;
}
