import { db } from "@/db/db";
import type { Elysia } from "elysia";


type CommentParams = {
    params: {
        cid: string
    }
    status: any
}

export function commentReplies(app: Elysia) {
    return app.get('/replies', async ({ params, status }: CommentParams) => {
        const { cid } = params;

        // Be cause this is replies the ownerId is the parentId
        try {
            const replies = await db.query.comments.findMany({
                where: (comments, { eq, and, isNull }) => and(
                    eq(comments.parentId, cid),
                    isNull(comments.deletedOn),
                ),
                orderBy: (comments, { desc }) => desc(comments.created),
                with: {
                    user: true,
                    replies: {
                        orderBy: (comments, { desc }) => desc(comments.created),
                        with: {
                            user: true,
                        },
                    },
                },
            })

            return status(200, replies);
        } catch (error) {
            console.error(error);
            status(500, { error: 'Internal server error' });
            return { error: 'Internal server error' }
        }
    })
}