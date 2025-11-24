import { db } from "@/db/db";
import { comments } from "@/db/schemas";
import type { Elysia } from "elysia";
import { eq, sql } from "drizzle-orm";

type CommentLikesParams = {
    params: {
        cid: string
    }
    status: any
}

export function commentLikes(app: Elysia) {
    return app.post('/likes', async ({ params, status }: CommentLikesParams) => {
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
    })
}