import { db } from "@/db/db";
import { supportAssistants } from "@/db/schemas";
import { calculateAICost, chunkedStream, getModel } from "@/libs/ai";
import { formattedPrompt } from "@/libs/ai/Prompts";
import { createMockConversation, invokeTestBot } from "@/libs/ai/TestChat";
import { getRedisClient } from "@/libs/redis";
import type {
    SupportConversation,
} from "@/types";
import { toUIMessageStream } from '@ai-sdk/langchain';
import { UpstashRedisChatMessageHistory } from "@langchain/community/stores/message/upstash_redis";
import { BaseMessage } from "@langchain/core/messages";
import { createUIMessageStreamResponse } from 'ai';
import { eq } from "drizzle-orm";
import type { Elysia } from "elysia";

type Props = {
    params: {
        lid: string;
    };
    body: {
        message: BaseMessage;
        memberId?: string;
    };
    status: any;
};

export async function testChatRoute(app: Elysia) {

    const redis = getRedisClient();
    const TTL = 60 * 60 * 1; // 1 hours

    return app.post("/test", async (ctx) => {
        const { body, status, params } = ctx;
        const { lid } = params as { lid: string };
        const { message, memberId } = body as { message: BaseMessage; memberId?: string };

        if (!memberId || !message) {
            return status(400, { error: "Invalid request" });
        }


        try {
            const assistant = await db.query.supportAssistants.findFirst({
                where: eq(supportAssistants.locationId, lid),
                with: {
                    triggers: true,
                },
            });

            if (!assistant) {
                return status(404, { error: "Support assistant not found" });
            }

            const sessionKey = `tc:${assistant.id}`;
            let session: SupportConversation | null = await redis.get(sessionKey);

            if (!session) {
                session = createMockConversation(assistant.id, memberId!, lid);
            }


            await redis.setex(sessionKey, 7200, session);
            const ml = await db.query.memberLocations.findFirst({
                where: (ml, { eq, and }) => and(eq(ml.memberId, memberId!), eq(ml.locationId, lid)),
                with: {
                    member: true,
                    location: true,
                },
            })


            if (!ml) {
                return status(404, { error: "Member location not found" });
            }

            const history = new UpstashRedisChatMessageHistory({
                sessionId: `msg:${session.id}`,
                client: redis,
                sessionTTL: TTL,
            })

            await history.addUserMessage(message.content as string)

            const model = getModel(assistant.model, (output) => {
                const usage = output.llmOutput?.tokenUsage;
                if (usage) {
                    const cost = calculateAICost(usage, assistant.model);
                    console.log(`💰 Test chat AI cost: ${cost} credits`);
                }
            });
            const systemPrompt = await formattedPrompt({ ml, assistant });


            const stream = new ReadableStream({
                async start(controller) {
                    const chunkSize = 15; // Slightly larger chunks for better performance
                    const delay = 30; // Reduced delay for smoother streaming
                    const iterator = invokeTestBot(session, assistant, ml, systemPrompt, model, history);

                    try {
                        for await (const value of iterator) {

                            if (!value) continue;
                            const text = value.toString();
                            const chunks = text.match(new RegExp(`.{1,${chunkSize}}`, 'g')) || [];

                            for (const chunk of chunks) {
                                controller.enqueue({ content: chunk });
                                await new Promise(resolve => setTimeout(resolve, delay));
                            }
                        }
                    } catch (error) {
                        controller.enqueue({
                            content: "\nError: Stream interrupted",
                            error: true
                        });
                    } finally {
                        await redis.setex(sessionKey, 7200, session);
                        controller.close();
                    }
                }
            });

            const res = createUIMessageStreamResponse({
                stream: toUIMessageStream(stream)
            });

            return res;
        } catch (error) {
            console.log(error)
            if (error instanceof Error) {
                console.log("BOT Error:", error.message);


                const stream = chunkedStream(`**Bot ended.** Reason: ${error.message}`);

                const res = createUIMessageStreamResponse({
                    stream: toUIMessageStream(stream)
                });

                return res;
            } else {
                console.log(error);
                return status(500, { message: "Internal Server Error" })
            }
        }
    }).get("/test/:sid", async ({ params, status }) => {
        try {
            const sessionKey = `tc:${params.sid}`;
            const session: SupportConversation | null = await redis.get(sessionKey);

            if (!session) {
                return status(404, { error: "Test chat session not found" });
            }

            return status(200, { session });
        } catch (error) {
            console.error("Error fetching test chat session:", error);
            return status(500, { error: "Failed to fetch test chat session" });
        }
    }).delete("/test/:sid", async ({ params, status }) => {

        try {

            await redis.del(`tc:${params.sid}`);
            await redis.del(`msg:${params.sid}`);

            return status(200, { message: "Test chat session deleted" });
        } catch (error) {
            console.error("Error deleting test chat session:", error);
            return status(500, { error: "Failed to delete test chat session" });
        }
    });
}



