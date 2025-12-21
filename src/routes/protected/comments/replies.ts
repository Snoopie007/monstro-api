import { db } from "@/db/db";
import { comments, groupPosts } from "@/db/schemas";
import { eq, sql } from "drizzle-orm";
import type { Elysia } from "elysia";
import { z } from "zod";

const ReplyGetProps = {
    params: z.object({
        cid: z.string(),
    }),
    query: z.object({
        depth: z.coerce.number().optional(), // fixz: use z.coerce for query param numbers
    }),
};

const ReplyPostProps = {
    params: z.object({
        cid: z.string(),
    }),
    body: z.object({
        content: z.string(),
        userId: z.string(),
    }),
};

export function commentReplies(app: Elysia) {
    app.get('/replies', async ({ params, status, query }) => {
        const { cid } = params;
        try {
            const replies = await db.query.comments.findMany({
                where: (comments, { eq, and, isNull }) =>
                    and(
                        eq(comments.parentId, cid),
                        isNull(comments.deletedOn)
                    ),
                orderBy: (comments, { desc }) => desc(comments.created),

            });

            const userIds = replies.map(r => r.userId);
            const users = await db.query.users.findMany({
                where: (users, { inArray }) => inArray(users.id, userIds),
                columns: {
                    id: true,
                    name: true,
                    image: true,
                },
            });
            const repliesWithUsers = replies.map(r => ({
                ...r,
                user: users.find(u => u.id === r.userId),
            }));
            return status(200, repliesWithUsers);
        } catch (error) {
            console.error(error);
            return status(500, { error: 'Internal server error' }); // fixz: ensure consistent return with status
        }
    }, ReplyGetProps);

    app.post('/replies', async ({ params, body, status }) => {
        const { cid } = params;
        const { content, userId } = body;

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
                return status(404, { error: 'User not found' });
            }

            const parentComment = await db.query.comments.findFirst({
                where: (comments, { eq }) => eq(comments.id, cid),
            });


            if (!parentComment) {
                return status(404, { error: 'Parent comment not found' });
            }


            const newReply = await db.transaction(async (tx) => {
                const [nr] = await tx.insert(comments).values({
                    parentId: cid,
                    ownerId: parentComment.ownerId,
                    ownerType: parentComment.ownerType,
                    depth: parentComment.depth + 1,
                    content: content,
                    userId: userId,
                }).returning();
                if (!nr) {
                    throw new Error('Failed to create reply');
                }
                await tx.update(comments).set({
                    replyCounts: sql`reply_counts + 1`
                }).where(eq(comments.id, cid));

                await tx.update(groupPosts).set({
                    commentCounts: sql`comment_counts + 1`
                }).where(eq(groupPosts.id, parentComment.ownerId));

                return nr;
            });
            if (newReply === null) {
                throw new Error('Failed to create reply');
            }
            return status(200, {
                ...newReply,
                user: user,
            });
        } catch (error) {
            console.error(error);
            return status(500, { error: (error as Error).message || 'Internal server error' });
        }
    }, ReplyPostProps);
    return app;
}