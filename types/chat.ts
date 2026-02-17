import { chatMembers, chats, messages } from "../schemas/chat";
import type { Group } from "./group";
import type { Location } from "./location";
import type { Media } from "./medias";
import type { ReactionCounts } from "./reactions";
import type { User } from "./user";
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
    reactions?: ReactionCounts[];
    files?: Media[];
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


