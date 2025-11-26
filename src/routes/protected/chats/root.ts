import { Elysia } from 'elysia';
import { db } from '@/db/db';
import { sendMessageRoute } from './send';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { reactionCounts } from '@/db/schemas/chat/reactions';


type ChatProps = {
    memberId: string
    userId: string
    params: {
        uid: string
        cid: string
    }
    status: any
}


export const userChats = new Elysia({ prefix: '/chats' })
    .get('/', async ({ status, memberId, userId }: ChatProps) => {
        if (!memberId || !userId) {
            return status(401, { error: 'Unauthorized' });
        }
        try {

            const cms = await db.query.chatMembers.findMany({
                where: (chatMembers, { eq }) => eq(chatMembers.userId, userId!),
            })

            const chatIds = [...new Set(cms.map((cm) => cm.chatId))];
            const chats = await db.query.chats.findMany({
                where: (chats, { inArray }) => inArray(chats.id, chatIds),
                with: {
                    chatMembers: {
                        with: {
                            user: true,
                        },
                    },
                    group: true,
                    messages: {
                        orderBy: (messages, { desc }) => desc(messages.created),
                        limit: 1,
                        with: {
                            sender: true,
                        },
                    },
                },
            })

            return status(200, chats);
        } catch (error) {
            console.error(error);
            status(500, { error: 'Internal server error' });
            return { error: 'Internal server error' }
        }
    }).group('/:cid', (app) => {
        app.get('/', async ({ params, status }: ChatProps) => {
            const { cid } = params;

            try {
                const chat = await db.query.chats.findFirst({
                    where: (chats, { eq }) => eq(chats.id, cid),
                    with: {
                        group: true,
                        messages: {
                            orderBy: (messages, { desc }) => desc(messages.created),
                            limit: 50,
                            with: {
                                medias: true,
                                sender: true,
                            },
                        },
                    },
                })

                // Get all message IDs
                const messageIds = chat?.messages.map(m => m.id) || [];

                // Multiple messages (bulk)
                const reactions = await db.select().from(reactionCounts).where(and(
                    eq(reactionCounts.ownerType, 'message'),
                    inArray(reactionCounts.ownerId, messageIds)
                ));
                console.log(reactions);

                // Group reactions by message ID
                const reactionsByMessage = reactions.reduce((acc, reaction) => {
                    const messageId = reaction.ownerId; // Updated field name
                    if (!acc[messageId]) acc[messageId] = [];
                    acc[messageId].push(reaction);
                    return acc;
                }, {} as Record<string, any[]>);

                // Add reactions to each message
                const messagesWithReactions = chat?.messages.map(message => ({
                    ...message,
                    reactions: reactionsByMessage[message.id] || []
                }));

                return status(200, {
                    ...chat,
                    messages: messagesWithReactions
                });
            } catch (error) {
                console.error(error);
                status(500, { error: 'Internal server error' });
                return { error: 'Internal server error' }
            }
        })
        app.use(sendMessageRoute);
        return app;

    })

