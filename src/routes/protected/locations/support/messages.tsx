import type { Elysia } from "elysia";
import { getModel, calculateAICost, DEFAULT_SUPPORT_TOOLS } from "@/libs/ai";
import { db } from "@/db/db";
import { supportConversations, supportMessages } from "@/db/schemas/support";
import { eq } from "drizzle-orm";
import { formattedPrompt } from "@/libs/ai/Prompts";
import { ChatPromptTemplate, MessagesPlaceholder, SystemMessagePromptTemplate } from "@langchain/core/prompts";
import { ToolFunctions } from "@/libs/ai/FNHandler";
import type { MessageRole } from "@/types";
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





export async function supportMessagesRoute(app: Elysia) {

    return app.post('/message', async ({ body, status, params }: Props) => {
        const { lid, cid } = params;
        const { message, mid } = body;

        try {

            const conversation = await db.query.supportConversations.findFirst({
                where: (b, { eq }) => eq(b.id, cid),
                with: {
                    assistant: {
                        with: {
                            triggers: true
                        }
                    }
                }
            });


            if (!conversation) {
                return status(404, { error: "Conversation not found" });
            }

            if (!['open', 'pending', 'active'].includes(conversation.status)) {
                console.log('🟢 Conversation is not active');
                return status(400, { error: "Conversation is not active" });
            }

            if (conversation.isVendorActive) {
                const msg = await saveMessage(cid, message, 'user');
                return status(200, msg);
            }

            const ml = await db.query.memberLocations.findFirst({
                where: (b, { eq, and }) => and(eq(b.memberId, mid), eq(b.locationId, lid)),
                with: {
                    location: true,
                    member: true
                }
            });

            await saveMessage(cid, message, 'user');

            if (!ml) {
                return status(404, { error: "Member  not found" });
            }

            const messages = await db.query.supportMessages.findMany({
                where: (s, { eq }) => eq(s.conversationId, cid),
                orderBy: (b, { desc }) => desc(b.created),
                limit: 50,
            });



            //Taken Over? Return
            const model = getModel(conversation.assistant.model, (output) => {
                const usage = output.llmOutput?.tokenUsage;
                if (usage) {
                    const cost = calculateAICost(usage, conversation.assistant.model);
                    //Wallet
                }
            });

            const tools: Record<string, any>[] = [];
            DEFAULT_SUPPORT_TOOLS.forEach(tool => {
                tools.push({
                    type: "function",
                    function: tool
                });
            });


            const modelWithTools = model.bindTools(tools);
            const systemPrompt = await formattedPrompt({ ml, assistant: conversation.assistant });

            const prompt = ChatPromptTemplate.fromMessages([
                SystemMessagePromptTemplate.fromTemplate(systemPrompt),
                new MessagesPlaceholder(`history`),
            ]);

            const modelWithPrompt = prompt.pipe(modelWithTools);

            const history = messages.map(m => ({ role: m.role, content: m.content }));

            const res = await modelWithPrompt.invoke({ history });

            let c = res.content.toString();
            let r: MessageRole = 'assistant';
            if (res.tool_calls?.length) {
                for (const toolCall of res.tool_calls) {
                    console.log(toolCall)
                    const tool = ToolFunctions[toolCall.name as keyof typeof ToolFunctions];
                    if (tool) {
                        const { content, role, completed } = await tool(toolCall, {
                            conversation,
                            ml,
                        });

                        c = content;
                        r = role;
                    }
                }
            }
            const msg = await saveMessage(cid, c, r);

            // Update conversation timestamp
            await db.update(supportConversations).set({
                updated: new Date(),
            }).where(eq(supportConversations.id, cid));

            return status(200, msg);

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error('💥 Chat message error:', message);
            return status(500, { error: 'Failed to process message', details: message });
        }
    })

}


async function saveMessage(conversationId: string, content: string, role: MessageRole) {
    const [savedMessage] = await db.insert(supportMessages).values({
        conversationId,
        content,
        role,
        channel: 'WebChat',
        metadata: {
            savedAt: new Date().toISOString(),
            source: 'api-chat'
        },
    }).returning();



    return savedMessage;
}