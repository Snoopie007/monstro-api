import { db } from "@/db/db";
import { supportConversations } from "@/db/schemas";
import type { SupportConversation } from "@/types/support";
import { eq } from "drizzle-orm";
import type { Elysia } from "elysia";

export async function supportConversation(app: Elysia) {
    return app.get('/', async ({ params, status }) => {
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
    }).post('/', async ({ params, status, body }) => {
        const { cid } = await params as { cid: string };



        try {

            await db.update(supportConversations).set(body as Partial<SupportConversation>)
                .where(eq(supportConversations.id, cid));

            return status(200, { success: true });
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to update support" });
        }
    });
}
