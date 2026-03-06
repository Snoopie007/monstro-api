import { db } from "@/db/db";
import S3Bucket from "@/libs/s3";
import {
    getFileTypeCategory,
    getPostFiles,
    getTrimmedFormValue,
    isAllowedPostImageType,
    MAX_POST_FILE_SIZE,
    parsePostVideoEmbed,
} from "@/utils";
import { Elysia } from "elysia";
import { z } from "zod";
import type { ReactionCount } from "@subtrees/types/";
import { groupPosts, media, reactionCounts } from "@subtrees/schemas";
import { and, eq, inArray } from "drizzle-orm";

const GetGroupProps = {
    params: z.object({
        gid: z.string(),
    }),
};



export const groupRoutes = new Elysia({ prefix: 'groups' })
    .post('/post', async ({ request, status, ...ctx }) => {
        const { userId } = ctx as { userId?: string };

        if (!userId) {
            return status(401, { error: "Unauthorized" });
        }

        try {
            const formData = await request.formData();
            const groupId = getTrimmedFormValue(formData, "groupId");
            const title = getTrimmedFormValue(formData, "title");
            const content = getTrimmedFormValue(formData, "content");
            const rawVideoEmbed = formData.get("videoEmbed");
            const videoEmbed = typeof rawVideoEmbed === "string" ? rawVideoEmbed : null;
            const files = getPostFiles(formData);

            if (!groupId) {
                return status(400, { error: "Group ID is required" });
            }

            if (!title) {
                return status(400, { error: "Title is required" });
            }

            if (!content) {
                return status(400, { error: "Content is required" });
            }

            const [newPost] = await db.insert(groupPosts).values({
                groupId,
                authorId: userId,
                title,
                content,
                status: "published",
                metadata: parsePostVideoEmbed(videoEmbed),
            }).returning();

            if (!newPost) {
                return status(500, { error: "Failed to create post" });
            }

            const uploadedMedia: any[] = [];
            const s3 = new S3Bucket();

            for (const file of files) {
                if (!file || !file.name || file.size === 0) {
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

                    uploadedMedia.push(mediaRecord);
                } catch (uploadError) {
                    console.error(`Failed to upload file ${file.name}:`, uploadError);
                }
            }

            const enrichedPost = await db.query.groupPosts.findFirst({
                where: (posts, { eq }) => eq(posts.id, newPost.id),
                with: {
                    author: true,
                },
            });

            return status(201, {
                success: true,
                post: {
                    ...(enrichedPost ?? newPost),
                    media: uploadedMedia,
                },
            });
        } catch (error: any) {
            console.error("Error creating post:", error);
            return status(500, { error: error?.message || "Internal Server Error" });
        }
    }, {
        parse: 'none',
    })
    .group('/:gid', (app) => {
        app.get('/', async ({ params, status }) => {
            const { gid } = params;
            try {
                const group = await db.query.groups.findFirst({
                    where: (groups, { eq }) => eq(groups.id, gid),
                    with: {
                        location: true,

                        groupMembers: {
                            with: {
                                user: true,
                            },
                        },
                    },
                });
                if (!group) {
                    return status(404, { error: "Group not found" });
                }
                const posts = await db.query.groupPosts.findMany({
                    where: (groupPosts, { eq }) => eq(groupPosts.groupId, gid),
                    with: {
                        medias: true,
                        author: true,
                    },
                    limit: 50,
                    orderBy: (groupPosts, { desc }) => desc(groupPosts.created),
                });

                const postIds = posts.map(p => p.id) || [];

                let reactions: ReactionCount[] = [];

                if (postIds.length > 0) {
                    reactions = await db.select().from(reactionCounts).where(and(
                        eq(reactionCounts.ownerType, 'post'),
                        inArray(reactionCounts.ownerId, postIds)
                    ));
                }

                // Group reactions by message ID
                const reactionsByPost = reactions.reduce((acc, reaction) => {
                    const postId = reaction.ownerId; // Updated field name
                    if (!postId) return acc;
                    if (!acc[postId]) acc[postId] = [];
                    acc[postId].push(reaction);
                    return acc;
                }, {} as Record<string, any[]>);
                const postsWithReactions = posts.map(post => ({
                    ...post,
                    reactions: reactionsByPost[post.id] || []
                }));



                return status(200, {
                    ...group,
                    posts: postsWithReactions
                });
            } catch (error) {
                console.error(error);
                return status(500, { error: "Failed to fetch group" });
            }
        }, GetGroupProps)
        return app;
    })
