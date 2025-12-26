import { db } from "@/db/db";
import { comments, groupPosts } from "@/db/schemas";
import type { Elysia } from "elysia";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const GetCommentProps = {
    params: z.object({
        pid: z.string(),
    }),
};

const CommentPostsProps = {
    ...GetCommentProps,
    body: z.object({
        content: z.string(),
        depth: z.number().optional(),
        userId: z.string(),
        parentId: z.string().optional(),
    }),
};

export function commentPosts(app: Elysia) {
    app.get("/", async ({ params, status }) => {
        const { pid } = params;
        try {
            const commentList = await db.query.comments.findMany({
                where: (comments, { eq, and, isNull }) =>
                    and(
                        eq(comments.ownerId, pid),
                        isNull(comments.deletedOn),
                        isNull(comments.parentId)
                    ),
                orderBy: (comments, { desc }) => desc(comments.created),
                limit: 10,
            });

            const userIds = commentList.map((c) => c.userId);
            const users =
                userIds.length > 0
                    ? await db.query.users.findMany({
                        where: (users, { inArray }) => inArray(users.id, userIds),
                        columns: {
                            id: true,
                            name: true,
                            image: true,
                        },
                    })
                    : [];
            const commentsWithUsers = commentList.map((c) => ({
                ...c,
                user: users.find((u) => u.id === c.userId) || null,
            }));

            return status(200, commentsWithUsers);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Internal server error" });
        }
    }, GetCommentProps);

    app.post("/", async ({ params, body, status }) => {
        const { pid } = params;
        const { content, depth = 0, userId, parentId } = body;

        if (!userId || !content) {
            return status(400, { error: "Invalid request" });
        }

        try {
            const user = await db.query.users.findFirst({
                where: (users, { eq }) => eq(users.id, userId),
                columns: {
                    id: true,
                    name: true,
                    image: true,
                },
            });
            if (!user) {
                return status(404, { error: "User not found" });
            }

            const [newComment] = await db.insert(comments)
                .values({
                    ownerId: pid,
                    content,
                    depth: parentId ? (depth || 0) + 1 : 0,
                    ownerType: "post",
                    userId: userId,
                    parentId: parentId || null,
                })
                .returning();

            if (!newComment) {
                return status(500, { error: "Failed to create comment" });
            }

            // bump replyCounts on parent and commentCounts on groupPosts in a transaction
            await db.transaction(async (tx) => {
                if (parentId) {
                    await tx.update(comments)
                        .set({
                            replyCounts: sql`reply_counts + 1`,
                        })
                        .where(eq(comments.id, parentId));
                }
                await tx.update(groupPosts)
                    .set({
                        commentCounts: sql`comment_counts + 1`,
                    })
                    .where(eq(groupPosts.id, pid));
            });

            return status(200, {
                ...newComment,
                created:
                    newComment.created?.toISOString() ??
                    new Date().toISOString(),
                updated: newComment.updated?.toISOString() ?? null,
                deletedOn: newComment.deletedOn?.toISOString() ?? null,
                user,
            });
        } catch (error) {
            console.error(error);
            return status(500, { error: "Internal server error" });
        }
    }, CommentPostsProps);
    return app;
}