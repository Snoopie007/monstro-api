import type { Elysia } from "elysia";
import { ChatAIService } from "@/libs/ai/AI";
import { db } from "@/db/db";

const chatAIService = new ChatAIService();
type Props = {
    params: {
        mid: string;
        lid: string;
        cid: string;
    };
    body: {
        message: string;
        mid: string;
    };
    status: any;
};
export async function supportMessages(app: Elysia) {

    return app.post('/message', async ({ body, status, params }: Props) => {
        const { lid, cid } = params;
        const { message, mid } = body;

        try {

            const conversation = await db.query.supportConversations.findFirst({
                where: (b, { eq }) => eq(b.id, cid),
                with: {
                    assistant: true
                }
            });


            if (!conversation) {
                return status(404, { error: "Conversation not found" });
            }

            if (!['open', 'pending', 'active'].includes(conversation.status)) {
                console.log('🟢 Conversation is not active');
                return status(400, { error: "Conversation is not active" });
            }

            const ml = await db.query.memberLocations.findFirst({
                where: (b, { eq, and }) => and(eq(b.memberId, mid), eq(b.locationId, lid)),
                with: {
                    location: true,
                    member: true
                }
            });

            if (!ml) {
                return status(404, { error: "Member  not found" });
            }

            //Taken Over? Return

            const msg = await chatAIService.generateResponse(
                conversation,
                ml,
                message,
            );

            return status(200, msg);

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error('💥 Chat message error:', message);
            return status(500, { error: 'Failed to process message', details: message });
        }
    })

}