import { db } from "@/db/db";
import { comments, groupPosts } from "@/db/schemas";
import type { Elysia } from "elysia";
import { eq, sql } from "drizzle-orm";

type GetPostCommentsParams = {
    params: {
        pid: string
    }
    status: any
}

type PostCommentParams = {
    params: {
        pid: string
    }
    body: Record<string, any>
    status: any
}

export function commentPosts(app: Elysia) {
    app.get('/', async ({ params, status }: GetPostCommentsParams) => {
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
    }).post('/', async ({ params, body, status }: PostCommentParams) => {
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
                comments: sql`comments + 1`
            }).where(eq(groupPosts.id, pid));

            const { user } = owner;


            return status(200, { ...newComment, user });
        } catch (error) {
            console.error(error);
            status(500, { error: 'Internal server error' });
            return { error: 'Internal server error' }
        }
    })
    return app;
}