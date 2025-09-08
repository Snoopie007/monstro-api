import { db } from "@/db/db"
import { eq, getTableColumns } from "drizzle-orm"
import { Elysia } from "elysia"
import { supportConversations } from "@/db/schemas/"

type Props = {
    memberId: string
    params: {
        mid: string
        lid: string
        cid: string
    },
    status: any
}

type PostBody = {
    assistantId: string
}

export function mlSupportRoutes(app: Elysia) {
    return app.get('/support', async ({ memberId, params, status }: Props) => {
        const { mid, lid } = params;

        try {

            const assistant = await db.query.supportAssistants.findFirst({
                where: (b, { eq }) => eq(b.locationId, lid),
                with: {
                    conversations: {
                        where: (b, { eq }) => eq(b.memberId, mid)
                    }
                }
            });

            if (!assistant) {
                return status(404, { error: "No support assistant found" });
            }


            return status(200, assistant);
        } catch (error) {
            console.error('Database error:', error);
            return status(500, { error: "Failed to fetch support conversations" });
        }
    }).post('/support', async ({ memberId, params, status, body }: Props & { body: PostBody }) => {
        const { mid, lid } = params;

        const { assistantId } = body;
        try {


            const [conversation] = await db.insert(supportConversations).values({
                memberId: mid,
                locationId: lid,
                supportAssistantId: assistantId
            }).returning();
            return status(200, conversation);
        } catch (error) {
            console.error('Database error:', error);
            return status(500, { error: "Failed to create support conversation" });
        }
    });
}
