import type { reactions } from "@/db/schemas/chat";
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