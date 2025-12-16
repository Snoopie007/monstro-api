import { db } from "@/db/db";
import { comments, groupPosts } from "@/db/schemas";
import type { Elysia } from "elysia";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const CommentPostsProps = {
    params: z.object({
        pid: z.string(),
    }),
    body: z.object({
        content: z.string(),
        depth: z.number(),
        type: z.string(),
        userId: z.string(),
        parentId: z.string().optional(),
    }),
};

export function commentPosts(app: Elysia) {
    app.get('/', async ({ params, status }) => {
        const { pid } = params;

        try {
            const comments = await db.query.comments.findMany({
                where: (comments, { eq, and, isNull }) => and(
                    eq(comments.ownerId, pid),
                    isNull(comments.deletedOn),
                    isNull(comments.parentId),
                ),
                orderBy: (comments, { desc }) => desc(comments.created),
                limit: 10,
                with: {
                    user: true,
                },
            });

            if (!comments) {
                return status(404, { error: "Post comments not found" });
            }
            return status(200, comments);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch post comments" });
        }
    }, CommentPostsProps).post('/', async ({ params, body, status }) => {
        const { pid } = params;

        const { content, depth, type, userId, parentId } = body;
        if (!userId || !content || !type) {
            return status(400, { error: "Invalid request" });
        }

        const userType = userId.startsWith("mbr_") ? "member" : "vendor";
        try {

            let owner;
            if (userType === "member") {
                owner = await db.query.members.findFirst({
                    where: (members, { eq }) => eq(members.id, userId),
                    with: {
                        user: {
                            columns: {
                                id: true,
                                name: true,
                                email: true,
                                image: true,
                            }
                        }
                    }
                });
            } else {
                owner = await db.query.vendors.findFirst({
                    where: (vendors, { eq }) => eq(vendors.id, userId),
                    with: {
                        user: {
                            columns: {
                                id: true,
                                name: true,
                                email: true,
                                image: true,
                            }
                        }
                    }
                });
            }
            if (!owner) {
                return status(404, { error: "User not found" });
            }

            const [newComment] = await db.insert(comments).values({
                ownerId: pid,
                content,
                depth: parentId ? (depth || 0) + 1 : 0,
                ownerType: type,
                userId: owner.userId,
                parentId: parentId || null,
            }).returning();

            if (parentId) {
                await db.update(comments).set({
                    replyCounts: sql`reply_counts + 1`
                }).where(eq(comments.id, parentId));
            }

            if (!newComment) {
                return status(500, { error: "Failed to create comment" });
            }

            await db.update(groupPosts).set({
                commentCounts: sql`comment_counts + 1`
            }).where(eq(groupPosts.id, pid));

            const { user } = owner;


            // Ensure dates are serialized as ISO strings
            return status(200, {
                ...newComment,
                created: newComment.created?.toISOString() ?? new Date().toISOString(),
                updated: newComment.updated?.toISOString() ?? null,
                deletedOn: newComment.deletedOn?.toISOString() ?? null,
                user,
            });
        } catch (error) {
            console.error(error);
            return status(500, { error: 'Internal server error' });
        }
    }, CommentPostsProps)
    return app;
}