import type { reactions } from "../schemas/chat";
import type { User } from "./user";


export type ReactionOwnerType = 'message' | 'post' | 'moment' | 'comment';

export type Reaction = typeof reactions.$inferSelect & {
    emoji: ReactionEmoji;
    user?: User;
}




export type ReactionEmoji = {
    value: string;
    name: string;
    type: string;
}

export type ReactionCount = {
    ownerType: string;
    ownerId: string;
    display: string;
    name: string;
    type: string;
    count: number;
    userNames: string[];
    userIds: string[];
    created?: Date;
}