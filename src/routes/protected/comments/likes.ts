import { db } from "@/db/db";
import { comments } from "@/db/schemas";
import type { Context, Elysia } from "elysia";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const CommentLikesProps = {
    params: z.object({
        cid: z.string(),
    }),
};

export function commentLikes(app: Elysia) {
    return app.post('/likes', async ({ params, body, status, ...ctx }) => {

        const { cid } = params;
        try {

            await db.update(comments).set({
                likes: sql`likes + 1`,
            }).where(eq(comments.id, cid));
            return status(200, { success: true });
        } catch (error) {
            console.error(error);
            return status(500, { error: 'Internal server error' });
        }
    }, CommentLikesProps)
}