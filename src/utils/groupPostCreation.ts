import { db } from "@/db/db";
import { broadcastNewFeeds } from "@/libs/broadcast/feeds";
import { sendNotifications } from "@/libs/expo";
import S3Bucket from "@/libs/s3";
import { ServerState } from "@/state";
import { groupMembers, groupPosts, groups, media, userFeeds } from "@subtrees/schemas";
import type { GroupPost, Media } from "@subtrees/types";
import { and, eq } from "drizzle-orm";
import {
    getFileTypeCategory,
    getPostFiles,
    getTrimmedFormValue,
    isAllowedPostImageType,
    MAX_POST_FILE_SIZE,
    parsePostVideoEmbed,
} from "./posts";

type CreateGroupPostSuccess = {
    success: true;
    post: GroupPost;
};

type CreateGroupPostFailure = {
    error: string;
};

export type CreateGroupPostResult = {
    status: 201;
    body: CreateGroupPostSuccess;
} | {
    status: 400 | 401 | 404 | 500;
    body: CreateGroupPostFailure;
};

type CreateGroupPostFromFormDataProps = {
    formData: { get: (name: string) => unknown; getAll: (name: string) => unknown[] };
    authorId: string | null | undefined;
    locationId?: string;
};

async function notifyNewMessage(post: GroupPost, userIds: string[]): Promise<void> {
    const notifications = await db.query.userNotifications.findMany({
        where: (n, { eq, inArray, and }) => and(
            inArray(n.userId, userIds),
            eq(n.enabled, true),
        ),
    });
    if (notifications.length === 0) return;

    const image = post.medias?.[0]?.url;
    const truncatedTitle = post.title ? post.title.substring(0, 100) : "";
    const truncatedContent = post.content ? post.content.substring(0, 100) : "";
    const messages = notifications.map(notification => ({
        to: notification.token,
        title: truncatedTitle,
        body: truncatedContent || "shared images",
        channelId: "default",
        categoryId: "post",
        ...(image ? { richContent: { image } } : {}),
        data: {
            postId: post.id,
            groupId: post.groupId,
        },
    }));

    await sendNotifications(messages);
}

export async function createGroupPostFromFormData({
    formData,
    authorId,
    locationId,
}: CreateGroupPostFromFormDataProps): Promise<CreateGroupPostResult> {
    if (!authorId) {
        return { status: 401, body: { error: "Unauthorized" } };
    }

    const groupId = getTrimmedFormValue(formData, "groupId");
    const title = getTrimmedFormValue(formData, "title");
    const content = getTrimmedFormValue(formData, "content");
    const rawVideoEmbed = formData.get("videoEmbed");
    const videoEmbed = typeof rawVideoEmbed === "string" ? rawVideoEmbed : null;
    const files = getPostFiles(formData);

    if (!groupId) {
        return { status: 400, body: { error: "Group ID is required" } };
    }

    if (locationId) {
        const group = await db.query.groups.findFirst({
            where: and(eq(groups.id, groupId), eq(groups.locationId, locationId)),
            columns: { id: true },
        });

        if (!group) {
            return { status: 404, body: { error: "Group not found" } };
        }
    }

    if (!title) {
        return { status: 400, body: { error: "Title is required" } };
    }

    if (!content) {
        return { status: 400, body: { error: "Content is required" } };
    }

    const [newPost] = await db.insert(groupPosts).values({
        groupId,
        authorId,
        title,
        content,
        status: "published",
        metadata: parsePostVideoEmbed(videoEmbed),
    }).returning();

    if (!newPost) {
        return { status: 500, body: { error: "Failed to create post" } };
    }

    const uploadedMedia: Media[] = [];
    const s3 = new S3Bucket();

    for (const file of files) {
        if (!file.name || file.size === 0) {
            continue;
        }

        if (file.size > MAX_POST_FILE_SIZE) {
            console.warn(`File ${file.name} exceeds size limit, skipping`);
            continue;
        }

        if (!isAllowedPostImageType(file.type)) {
            console.warn(`File ${file.name} has unsupported type (${file.type}), skipping`);
            continue;
        }

        try {
            const s3Result = await s3.uploadFile(file as File, `groups/${groupId}/posts/${newPost.id}`);

            const [mediaRecord] = await db.insert(media).values({
                ownerId: newPost.id,
                ownerType: "post",
                fileName: file.name,
                fileType: getFileTypeCategory(file.type),
                fileSize: file.size,
                mimeType: file.type,
                url: s3Result.url,
                thumbnailUrl: null,
                altText: null,
            }).returning();

            if (mediaRecord) {
                uploadedMedia.push(mediaRecord);
            }
        } catch (uploadError) {
            console.error(`Failed to upload file ${file.name}:`, uploadError);
        }
    }

    const enrichedPost: GroupPost = {
        ...newPost,
        medias: uploadedMedia,
    };

    const groupUserIds = await db.query.groupMembers.findMany({
        where: eq(groupMembers.groupId, groupId),
        columns: {
            userId: true,
        },
    });

    if (groupUserIds.length > 0) {
        const onlineUsers = ServerState.onlineUsers;
        const groupOnlineUserIds = groupUserIds.filter(user => onlineUsers.has(user.userId)).map(user => user.userId);
        const groupOfflineUserIds = groupUserIds.filter(user => !onlineUsers.has(user.userId)).map(user => user.userId);

        const newFeeds = await db.insert(userFeeds).values(groupUserIds.map(groupUser => ({
            userId: groupUser.userId,
            postId: newPost.id,
            authorId,
            groupId,
        }))).returning();

        if (groupOfflineUserIds.length > 0 && newFeeds) {
            notifyNewMessage(enrichedPost, groupOfflineUserIds)
                .catch(error => console.error("Error notifying new message:", error));
        }

        if (groupOnlineUserIds.length > 0 && newFeeds) {
            const broadcastedFeeds = newFeeds.map(feed => ({
                ...feed,
                post: enrichedPost,
            }));
            broadcastNewFeeds(broadcastedFeeds).catch(error => console.error("Error broadcasting new message:", error));
        }
    }

    return {
        status: 201,
        body: {
            success: true,
            post: enrichedPost,
        },
    };
}
