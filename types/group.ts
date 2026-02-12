import { comments, groupMembers, groupPosts, groups } from "../schemas/chat";
import type { Location } from "./location";
import type { User } from "./user";
import type { Media } from "./medias";
import type { ReactionCount } from "./reactions";

export type Group = typeof groups.$inferSelect & {
    memberCount?: number;
    membersPreview?: GroupMemberPreview[];
    location?: Location;
    groupMembers?: GroupMember[];
    posts?: GroupPost[];
};

export type GroupMember = typeof groupMembers.$inferSelect & {
    user: User;
};

export type GroupMemberPreview = {
    id: string;
    name: string;
    image?: string | null;
};

export type GroupPostAuthor = {
    id: string;
    name: string;
    image?: string | null;
};

export type GroupPost = typeof groupPosts.$inferSelect & {
    author?: User;
    medias?: Media[];
    comments?: Comment[];
    reactions?: ReactionCount[];
}

export type Comment = typeof comments.$inferSelect & {
    author?: User;
    replies?: Comment[];
    parent?: Comment | null;
}
