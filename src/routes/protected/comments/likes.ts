import { db } from "@/db/db";
import { comments } from "@/db/schemas";
import type { Context, Elysia } from "elysia";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const CommentLikesProps = {
    params: z.object({
        cid: z.string(),
    }),
    body: z.object({
        userId: z.string(),
        remove: z.boolean()
    }),
};

export function commentLikes(app: Elysia) {
    return app.post('/likes', async ({ params, body, status, ...ctx }) => {
        const { userId, remove } = body;
        const { cid } = params;
        try {

            if (remove) {
                await db.update(comments).set({
                    likes: sql`array_remove(likes, ${userId})`,
                }).where(eq(comments.id, cid));

            } else {
                await db.update(comments).set({
                    likes: sql`array_append(likes, ${userId})`,
                }).where(eq(comments.id, cid));

            }


            return status(200, { success: true });
        } catch (error) {
            console.error(error);
            return status(500, { error: 'Internal server error' });
        }
    }, CommentLikesProps)
}