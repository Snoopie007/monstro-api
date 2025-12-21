import { db } from '@/db/db';
import { reactionCounts } from '@/db/schemas/chat/reactions';
import { and, eq, inArray } from 'drizzle-orm';
import { Elysia } from 'elysia';
import { chatMembers, chats } from '@/db/schemas/chat/chats';
import { messageRoute } from './messages';
import type { Context } from 'elysia';
import { z } from 'zod';

const NewChatProps = {

    body: z.object({
        addresseeId: z.string(),
    }),
};

const ChatProps = {
    params: z.object({
        cid: z.string(),
    }),
};

export const userChats = new Elysia({ prefix: '/chats' })
    .get('/', async ({ status, ...ctx }) => {
        const { memberId, userId } = ctx as Context & { memberId: string, userId: string };
        if (!memberId || !userId) {
            return status(401, { message: "Unauthorized", code: "UNAUTHORIZED" });
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
                            user: {
                                columns: {
                                    id: true,
                                    name: true,
                                    image: true,
                                },
                            },
                        },
                    },
                    group: {
                        columns: {
                            id: true,
                            name: true,
                            coverImage: true,
                        },
                    },
                    location: {
                        columns: {
                            id: true,
                            name: true,
                            logoUrl: true,
                        },
                    },
                    messages: {
                        orderBy: (messages, { desc }) => desc(messages.created),
                        limit: 1,
                        columns: {
                            id: true,
                            content: true,
                            created: true,
                        },
                    }
                },
            })

            const chatWithLastMessage = chats.map(chat => {

                return {
                    ...chat,
                    lastMessage: chat.messages[0],
                }
            })

            return status(200, chatWithLastMessage);
        } catch (error) {
            console.error(error);
            status(500, { error: 'Internal server error' });
            return { error: 'Internal server error' }
        }
    }).post('/', async ({ body, params, status, ...ctx }) => {
        const { userId } = ctx as Context & { userId: string };
        const { addresseeId } = body;
        try {

            const user = await db.query.users.findFirst({
                where: (users, { eq }) => eq(users.id, userId),
                columns: {
                    id: true,
                    name: true,
                    image: true,
                },
            });
            if (!user) {
                return status(404, { error: 'User not found' });
            }

            const addressee = await db.query.users.findFirst({
                where: (users, { eq }) => eq(users.id, addresseeId),
                columns: {
                    id: true,
                    name: true,
                    image: true,
                },
            });
            if (!addressee) {
                return status(404, { error: 'Addressee not found' });
            }

            const chat = await db.transaction(async (tx) => {
                const [chat] = await tx.insert(chats).values({
                    startedBy: userId,
                    name: addressee.name,
                }).returning();

                if (!chat) {
                    return await tx.rollback();
                }

                await tx.insert(chatMembers).values([{
                    chatId: chat.id,
                    userId: userId,
                }, {
                    chatId: chat.id,
                    userId: addresseeId,
                }]);
                return {
                    ...chat,
                    chatMembers: [
                        {
                            chatId: chat.id,
                            userId: userId,
                            user: user,
                        },
                        {
                            chatId: chat.id,
                            userId: addresseeId,
                            user: addressee,
                        },
                    ],
                    messages: [],
                };
            });

            return status(200, chat);
        } catch (error) {
            console.error(error);
            status(500, { error: 'Internal server error' });
            return { error: 'Internal server error' }
        }
    }, NewChatProps)
    .group('/:cid', (app) => {
        app.get('/', async ({ params, status }) => {
            const { cid } = params;

            try {
                const chat = await db.query.chats.findFirst({
                    where: (chats, { eq }) => eq(chats.id, cid),
                    with: {
                        group: true,
                        chatMembers: {
                            with: {
                                user: {
                                    columns: {
                                        id: true,
                                        name: true,
                                        image: true,
                                    },
                                },
                            },
                        }
                    },
                })


                return status(200, chat);
            } catch (error) {
                console.error(error);
                status(500, { error: 'Internal server error' });
                return { error: 'Internal server error' }
            }
        }, ChatProps)
        app.use(messageRoute);
        return app;

    })
