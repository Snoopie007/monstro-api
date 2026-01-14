import { comments, groupMembers, groupPosts, groups } from "@/db/schemas/groups";
import { User } from "./user";
import { Media } from "./media";
import { ReactionCount } from "./reactions";

export type Group = typeof groups.$inferSelect & {
    memberCount?: number;
    membersPreview?: GroupMemberPreview[];
    members?: GroupMember[];
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
    user: User;
    media?: Media[];
    reactions?: ReactionCount[];
};

export type PostComment = typeof comments.$inferSelect & {
    user: User | null;
    replies?: PostComment[];
    parent?: PostComment | null;
};
