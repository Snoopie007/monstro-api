import { comments, groupMembers, groupPosts, groups } from "../schemas/chat";
import type { Location } from "./location";
import type { Media } from "./medias";
import type { ReactionCount } from "./reactions";
import type { User } from "./user";

export type GroupMember = typeof groupMembers.$inferSelect & {
    user?: User;
}

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

export type Comment = typeof comments.$inferSelect & {
    user?: User;
    author?: User;
    replies?: Comment[];
    parent?: Comment | null;
}

export type PostComment = Comment;

export type GroupPost = typeof groupPosts.$inferSelect & {
    author?: User;
    user?: User;
    medias?: Media[];
    comments?: Comment[];
    reactions?: ReactionCount[];
    group?: Group;
}

export type Group = typeof groups.$inferSelect & {
    memberCount?: number;
    postCount?: number;
    membersPreview?: GroupMemberPreview[];
    location?: Location;
    groupMembers?: GroupMember[];
    posts?: GroupPost[];
}
