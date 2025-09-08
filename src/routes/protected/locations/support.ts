import { db } from "@/db/db";
import type { Elysia } from "elysia";

export async function locationSupport(app: Elysia) {
    return app.get('/support/:cid', async ({ params, status }) => {
        const { cid } = await params as { cid: string };

        try {
            const conversation = await db.query.supportConversations.findFirst({
                where: (b, { eq }) => eq(b.id, cid),
                with: {
                    messages: true,
                    assistant: true
                }
            });

            return status(200, conversation);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch support" });
        }
    });
}
