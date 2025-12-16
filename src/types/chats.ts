import { User } from "./user";
import { chats, messages, chatMembers } from "@/db/schemas";
import { Media } from "./media";
import { ReactionCount } from "./reactions";
import { Location } from "./location";
import { Group } from "./groups";

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


export type Message = typeof messages.$inferSelect & {
    sender?: User;
    medias?: Media[];
    reactions?: ReactionCount[];
    progress?: number;
    pendingFiles?: File[];
    isOptimistic?: boolean;
}