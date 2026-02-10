import { comments, groupMembers, groupPosts, groups } from "../schemas/chat";
import type { Location } from "./location";
import type { User } from "./user";
import type { Media } from "./medias";
import type { ReactionCounts } from "./reactions";

export type GroupMember = typeof groupMembers.$inferSelect & {
    user?: User;
}


export type Comment = typeof comments.$inferSelect & {
    author?: User;
}
export type GroupPost = typeof groupPosts.$inferSelect & {
    author?: User;
    medias?: Media[];
    comments?: Comment[];
    reactions?: ReactionCounts[];
}
export type Group = typeof groups.$inferSelect & {
    location?: Location;
    groupMembers?: GroupMember[];
    posts?: GroupPost[];
}