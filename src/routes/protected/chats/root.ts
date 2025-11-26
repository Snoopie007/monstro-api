import { Elysia } from 'elysia';
import { db } from '@/db/db';
import { sendMessageRoute } from './send';
import { sql } from 'drizzle-orm';


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

                // Single query to get ALL reactions for ALL messages
                const reactions = await db.execute(
                    sql`  SELECT * FROM get_reaction_summary_bulk('message', ${messageIds})
       `
                );

                console.log(reactions);
                // Group reactions by message ID
                // const reactionsByMessage = reactions.reduce((acc, reaction) => {
                //     const messageId = reaction.owner_id;
                //     if (!acc[messageId]) acc[messageId] = [];
                //     acc[messageId].push(reaction);
                //     return acc;
                // }, {} as Record<string, any[]>);

                return status(200, chat);
            } catch (error) {
                console.error(error);
                status(500, { error: 'Internal server error' });
                return { error: 'Internal server error' }
            }
        })
        app.use(sendMessageRoute);
        return app;

    })

