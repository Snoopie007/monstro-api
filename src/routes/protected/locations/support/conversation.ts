import { db } from "@/db/db";
import { supportConversations } from "@/db/schemas";
import type { SupportConversation } from "@/types/support";
import { OpenAI } from "openai";
import { eq } from "drizzle-orm";
import type { Elysia } from "elysia";


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

            await db.update(supportConversations).set(body as Partial<SupportConversation>)
                .where(eq(supportConversations.id, cid));

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

            await db.update(supportConversations).set({ title: conversationName }).where(eq(supportConversations.id, cid));
            return status(200, { name: conversationName });
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to create conversation name" });
        }
    });
}
