import { User } from "./user";
import { chats, messages, chatMembers } from "@subtrees/schemas";
import { Media } from "./medias";
import { ReactionCount } from "./reactions";
import { Location } from "./location";
import { Group } from "./group";

export type Chat = typeof chats.$inferSelect & {
    messages?: Message[];
    startedBy?: User;
    location?: Location;
    group?: Group;
    chatMembers?: ChatMember[];
}

export type ChatMember = typeof chatMembers.$inferSelect & {
    user?: User;
}

export type MessageSender = Omit<User, 'password' | 'email' | 'emailVerified' | 'created' | 'updated'>;

export type MessageReply = {
    id: string;
    senderId: string;
    content: string | null;
    sender?: MessageSender;
}

export type Message = typeof messages.$inferSelect & {
    sender?: User;
    medias?: Media[];
    reactions?: ReactionCount[];
    progress?: number;
    pendingFiles?: File[];
    isOptimistic?: boolean;
    reply?: MessageReply;
}