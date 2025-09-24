import type { Elysia } from "elysia";
import { getModel, calculateAICost, DEFAULT_SUPPORT_TOOLS, formatHistory } from "@/libs/ai";
import { db } from "@/db/db";
import { supportConversations, supportMessages } from "@/db/schemas/support";
import { eq } from "drizzle-orm";
import { formattedPrompt } from "@/libs/ai/Prompts";
import { ChatPromptTemplate, MessagesPlaceholder, SystemMessagePromptTemplate } from "@langchain/core/prompts";
import { AIMessage, BaseMessage, ToolMessage } from "@langchain/core/messages";
import { ToolFunctions } from "@/libs/ai/FNHandler";
import type { SupportConversation, MemberLocation, NewSupportMessage, SupportMessage } from "@/types";
import { Runnable } from "@langchain/core/runnables";


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
            await saveMessage({ conversationId: cid, role: 'human', content: message });
            if (conversation.isVendorActive) {
                return status(200, { success: true });
            }

            const ml = await db.query.memberLocations.findFirst({
                where: (b, { eq, and }) => and(eq(b.memberId, mid), eq(b.locationId, lid)),
                with: {
                    location: true,
                    member: true
                }
            });

            if (!ml) {
                return status(404, { error: "Member location not found" });
            }

            const messages = await db.query.supportMessages.findMany({
                where: (s, { eq }) => eq(s.conversationId, cid),
                orderBy: (b, { desc }) => desc(b.created),
                limit: 20,
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
            //Trigger Tools Need to be Added

            const modelWithTools = model.bindTools(tools);
            const systemPrompt = await formattedPrompt({ ml, assistant: conversation.assistant });

            const prompt = ChatPromptTemplate.fromMessages([
                SystemMessagePromptTemplate.fromTemplate(systemPrompt),
                new MessagesPlaceholder(`history`),
            ]);

            const modelWithPrompt = prompt.pipe(modelWithTools);

            const history = formatHistory(messages);

            await invokeBot(modelWithPrompt, history, conversation, ml);

            // Update conversation timestamp
            await db.update(supportConversations).set({
                updated: new Date(),
            }).where(eq(supportConversations.id, cid));

            return status(200, { success: true });

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error('💥 Chat message error:', message);
            return status(500, { error: 'Failed to process message', details: message });
        }
    })

}




async function invokeBot(
    model: Runnable,
    history: BaseMessage[],
    conversation: SupportConversation,
    ml: MemberLocation
) {

    console.log('Invoking bot', history);
    const res = await model.invoke({ history: history });

    if (res.tool_calls?.length) {

        for (const toolCall of res.tool_calls) {
            console.log('Processing tool call:', toolCall.name);
            const tool = ToolFunctions[toolCall.name as keyof typeof ToolFunctions];


            await saveMessage({
                conversationId: conversation.id,
                content: res.content.toString(),
                channel: 'WebChat',
                metadata: {
                    tool_calls: res.tool_calls,
                },
                role: 'tool_call',
            });
            history.push(new AIMessage({
                content: res.content.toString(),
                tool_calls: res.tool_calls
            }));



            const toolResult = await tool(toolCall, {
                conversation,
                ml,
            });
            await saveMessage({
                conversationId: conversation.id,
                content: toolResult,
                metadata: {
                    tool_call_id: toolCall.id,
                    tool_name: toolCall.name,
                    tool_args: toolCall.args,
                },
                channel: 'WebChat',
                role: 'tool',
            });
            history.push(new ToolMessage({
                content: toolResult,
                tool_call_id: toolCall.id,
                name: toolCall.name,
            }));

        }
        return await invokeBot(model, history, conversation, ml);
    } else {
        await saveMessage({
            conversationId: conversation.id,
            content: res.content.toString(),
            channel: 'WebChat',
            role: 'ai',
        })

    }

}

async function saveMessage(newMessage: NewSupportMessage): Promise<SupportMessage> {

    const [savedMessage] = await db.insert(supportMessages).values({
        ...newMessage,
        channel: 'WebChat',
    }).returning();


    if (!savedMessage) {
        throw new Error('Failed to save message');
    }

    return savedMessage;
}