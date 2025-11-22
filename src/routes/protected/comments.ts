import { Elysia } from "elysia";
import { db } from "@/db/db";
import { comments, moments, groupPosts } from "@/db/schemas";
import { eq, sql } from "drizzle-orm";
type CommentParams = {
    params: {
        ownerId: string
    }
    body: Record<string, any>
    status: any
}


export const commentRoutes = new Elysia({ prefix: 'comments/:ownerId' })
    .get('/', async ({ params, status }: CommentParams) => {
        const { ownerId } = params;
        const comments = await db.query.comments.findMany({
            where: (comments, { eq, and, isNull }) => and(
                eq(comments.ownerId, ownerId),
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
    }).post('/', async ({ params, body, status }: CommentParams) => {
        const { ownerId } = params;

        const { content, depth, type, userId, parentId } = body;
        if (!userId || !content || !type) {
            return status(400, { error: "Invalid request" });
        }

        const userType = userId.startsWith("mbr_") ? "member" : "vendor";
        try {

            let user;
            if (userType === "member") {
                user = await db.query.members.findFirst({
                    where: (members, { eq }) => eq(members.id, userId)
                });
            } else {
                user = await db.query.vendors.findFirst({
                    where: (vendors, { eq }) => eq(vendors.id, userId)
                });
            }
            if (!user) {
                return status(404, { error: "User not found" });
            }

            const [newComment] = await db.insert(comments).values({
                ownerId,
                content,
                depth: parentId ? (depth || 0) + 1 : 0,
                ownerType: type,
                userId: user.userId,
            }).returning();

            // Update the reply counts for the parent comment
            if (parentId) {
                await db.update(comments).set({
                    replyCounts: sql`reply_counts + 1`
                }).where(eq(comments.id, parentId));
            }

            if (!newComment) {
                return status(500, { error: "Failed to create comment" });
            }

            if (type === "post") {
                await db.update(groupPosts).set({
                    comments: sql`comments + 1`
                }).where(eq(groupPosts.id, ownerId));
            } else if (type === "memory") {
                await db.update(moments).set({
                    comments: sql`comments + 1`
                }).where(eq(moments.id, ownerId));
            }
            return status(200, newComment);
        } catch (error) {
            console.error(error);
            status(500, { error: 'Internal server error' });
            return { error: 'Internal server error' }
        }
    }).group('/replies', (app) => {
        app.get('/', async ({ params, status }: CommentParams) => {
            const { ownerId } = params;
            try {
                const replies = await db.query.comments.findMany({
                    where: (comments, { eq, and, isNull }) => and(
                        eq(comments.ownerId, ownerId),
                        isNull(comments.deletedOn),
                        isNull(comments.parentId),
                    ),
                    orderBy: (comments, { desc }) => desc(comments.created),
                    with: {
                        user: true,
                        replies: {
                            orderBy: (r, { desc }) => desc(r.created),
                            where: (r, { eq, and, isNull, lte }) => and(
                                eq(r.ownerId, ownerId),
                                isNull(r.deletedOn),
                                isNull(r.parentId),
                                lte(r.depth, 4),
                            ),
                            with: {
                                user: true,
                            }
                        }
                    },
                })
                return status(200, replies);
            } catch (error) {
                console.error(error);
                status(500, { error: 'Internal server error' });
                return { error: 'Internal server error' }
            }
        })
        return app;
    })
