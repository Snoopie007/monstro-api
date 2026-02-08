import { db } from "@/db/db";
import { comments } from "@subtrees/schemas";
import { eq, sql } from "drizzle-orm";
import type { Elysia } from "elysia";
import { z } from "zod";

const CommentLikesProps = {
    params: z.object({
        cid: z.string(),
    }),
    body: z.object({
        userId: z.string(),
    }),
};

export function commentLikes(app: Elysia) {
    return app.post('/likes', async ({ params, body, status }) => {
        const { cid } = params;
        const { userId } = body;

        if (!userId) {
            return status(400, { error: 'userId is required' });
        }

        try {
            // Toggle like: add if not present, remove if present
            const result = await db.update(comments).set({
                likes: sql`
                    CASE 
                        WHEN ${userId} = ANY(likes) 
                        THEN array_remove(likes, ${userId})
                        ELSE array_append(likes, ${userId})
                    END
                `,
            }).where(eq(comments.id, cid)).returning({
                likes: comments.likes,
            });

            const updated = result[0];
            if (!updated) {
                return status(404, { error: 'Comment not found' });
            }

            return status(200, {
                success: true,
                likeCounts: updated.likes?.length ?? 0,  // Derive from array length
                likes: updated.likes,
            });
        } catch (error) {
            console.error(error);
            return status(500, { error: 'Internal server error' });
        }
    }, CommentLikesProps);
}
