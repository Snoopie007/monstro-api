import { groups, groupPosts, postComments, groupMembers } from "@/db/schemas/groups";
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
    type: "image" | "video";
};

export type GroupPostAuthor = {
    id: string;
    name: string;
    image?: string | null;
};

export type GroupPost = typeof groupPosts.$inferSelect & {
    // attachments?: GroupPostAttachment[];
    user: User;
    // commentCount: number;
    // reactions: {
    //     total: number;
    //     viewerHasReacted: boolean;
    // };
};

export type PostComment = typeof postComments.$inferSelect & {
    author: GroupPostAuthor;
};

  