import { comments, groupPosts, groups } from "@/db/schemas/groups";
import { User } from "./user";

export type Group = {
    id: string;
    name: string;
    description?: string | null;
    type: string;
    handle: string;
    coverImage?: string | null;
};

export type GroupMemberPreview = {
    id: string;
    name: string;
    image?: string | null;
};

export type GroupCommunity = typeof groups.$inferSelect & {
    memberCount: number;
    membersPreview: GroupMemberPreview[];
};

export type GroupPostAttachment = {
    id: string;
    url: string;
    type: "image" | "video" | "audio" | "document" | "other";
};

export type GroupPostMedia = {
    id: string;
    url: string;
    fileType: string;
    fileName: string;
};

export type GroupPostAuthor = {
    id: string;
    name: string;
    image?: string | null;
};

export type GroupPost = typeof groupPosts.$inferSelect & {
    user: User;
    media?: GroupPostMedia[];
    reactions?: ReactionCount[];
};

export type PostComment = typeof comments.$inferSelect & {
    user: User | null;
    replies?: PostComment[];
    parent?: PostComment | null;
};

export type ReactionCount = {
    ownerType: string;
    ownerId: string;
    display: string;
    name: string;
    type: string;
    count: number;
    userNames: string[];
    userIds: string[];
};
