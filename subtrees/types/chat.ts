import { chatMembers, chats, messages } from "../schemas/chat";
import type { Group } from "./group";
import type { Media } from "./medias";
import type { User } from "./user";
import type { Location } from "./location";
type LastChatMessage = {
    content: string | null;
    created: Date;
}

export type Chat = typeof chats.$inferSelect & {
    members?: ChatMember[];
    messages?: Message[];
    group?: Group;
    location?: Location;
    chatMembers?: ChatMember[];
    lastMessage?: LastChatMessage;
}
export type Message = typeof messages.$inferSelect & {
    medias?: Media[];
    reply?: MessageReply;
    sender?: MessageSender;
}

export type MessageSender =
    Omit<User, 'password' | 'email' | 'emailVerified' | 'isChild' | 'created' | 'updated' | 'discriminator' | 'username'>;

export type MessageReply = {
    id: string;
    senderId: string;
    content: string | null;
    sender?: MessageSender;
}


export type ChatMember = typeof chatMembers.$inferSelect & {
    user?: User;
}


