import { groups, groupPosts, comments, groupMembers } from "@/db/schemas/groups";
import { users } from "@/db/schemas/users";
import { User } from "./user";

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
