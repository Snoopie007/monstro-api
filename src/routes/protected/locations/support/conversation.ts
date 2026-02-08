import { db } from "@/db/db";
import { supportConversations } from "@subtrees/schemas";
import {
    broadcastSupportConversation,
    formatSupportConversationPayload
} from "@/libs/support-broadcast";
import type { SupportConversation } from "@subtrees/types";
import { eq } from "drizzle-orm";
import type { Elysia } from "elysia";
import { OpenAI } from "openai";


const NamePrompt = (message: string, category: string) => {
    return `Generate a short, descriptive title (max 5 words) for a support conversation 
based on this first message: ${message} and category: ${category}.
Be as close to what the user is asking for as possible.`;
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});


export async function supportConversation(app: Elysia) {
    return app.get('/', async ({ params, status }) => {
        const { cid } = params as { cid: string };
        console.log('🟢 Fetching support conversation', cid);
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
        const { cid } = params as { cid: string };

        try {
            const [updatedConversation] = await db.update(supportConversations)
                .set({ ...(body as Partial<SupportConversation>), updated: new Date() })
                .where(eq(supportConversations.id, cid))
                .returning();

            if (updatedConversation) {
                // Broadcast to Supabase Realtime (for dashboard and mobile)
                try {
                    await broadcastSupportConversation(
                        updatedConversation.locationId,
                        formatSupportConversationPayload(updatedConversation as SupportConversation),
                        'conversation_updated'
                    );
                } catch (broadcastError) {
                    console.error('Failed to broadcast conversation update:', broadcastError);
                }
            }

            return status(200, { success: true });
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to update support" });
        }
    }).post('/new', async ({ params, status, body }) => {
        const { cid } = params as { cid: string };
        const { message, mid, category } = body as { message: string, mid: string, category: string };
        try {


            const res = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'system', content: NamePrompt(message, category) }],
                max_tokens: 50,
                temperature: 0,
            });
            const conversationName = res.choices[0]?.message?.content?.toString() || 'Unknown';

            const [updatedConversation] = await db.update(supportConversations)
                .set({ title: conversationName, updated: new Date() })
                .where(eq(supportConversations.id, cid))
                .returning();

            if (updatedConversation) {
                // Broadcast title update to Supabase Realtime (for dashboard and mobile)
                try {
                    await broadcastSupportConversation(
                        updatedConversation.locationId,
                        formatSupportConversationPayload(updatedConversation as SupportConversation),
                        'conversation_updated'
                    );
                } catch (broadcastError) {
                    console.error('Failed to broadcast title update:', broadcastError);
                }
            }

            return status(200, { name: conversationName });
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to create conversation name" });
        }
    });
}
