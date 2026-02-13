import { comments, groupMembers, groupPosts, groups } from "../schemas/chat";
import type { Location } from "./location";
import type { Media } from "./medias";
import type { ReactionCounts } from "./reactions";
import type { User } from "./user";

export type GroupMember = typeof groupMembers.$inferSelect & {
    user?: User;
}


export type Comment = typeof comments.$inferSelect & {
    user?: User;
    replies?: Comment[];
}
export type GroupPost = typeof groupPosts.$inferSelect & {
    author?: User;
    medias?: Media[];
    comments?: Comment[];
    reactions?: ReactionCounts[];
    group?: Group;
}
export type Group = typeof groups.$inferSelect & {
    location?: Location;
    groupMembers?: GroupMember[];
    posts?: GroupPost[];
    memberCount?: number;
    postCount?: number;
}