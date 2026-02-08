import { db } from "@/db/db";
import { Elysia, t } from "elysia";
import { chatMembers, chats } from "subtrees/schemas";
import { messageRoute } from "./messages";
const UserChatsProps = {
    params: t.Object({
        uid: t.String(),
    }),
};
export function userChatsRoutes(app: Elysia) {
    app.group('/chats', (app) => {
        app.get('/', async ({ status, params }) => {
            const { uid } = params;
            try {

                const cms = await db.query.chatMembers.findMany({
                    where: (chatMembers, { eq }) => eq(chatMembers.userId, uid),
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
        }, UserChatsProps);
        app.post('/', async ({ body, params, status, ...ctx }) => {
            const { uid } = params;
            const { addresseeId } = body;
            try {

                const user = await db.query.users.findFirst({
                    where: (users, { eq }) => eq(users.id, uid),
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
                        startedBy: uid,
                        name: addressee.name,
                    }).returning();

                    if (!chat) {
                        return await tx.rollback();
                    }

                    await tx.insert(chatMembers).values([{
                        chatId: chat.id,
                        userId: uid,
                    }, {
                        chatId: chat.id,
                        userId: addresseeId,
                    }]);


                    return {
                        ...chat,
                        chatMembers: [
                            {
                                chatId: chat.id,
                                userId: uid,
                                user: user,
                            },
                            {
                                chatId: chat.id,
                                userId: addresseeId,
                                user: addressee,
                            },
                        ],
                    };
                });

                return status(200, chat);
            } catch (error) {
                console.error(error);
                status(500, { error: 'Internal server error' });
                return { error: 'Internal server error' }
            }
        }, {
            ...UserChatsProps,
            body: t.Object({
                addresseeId: t.String(),
            }),

        })
        app.group('/:cid', (app) => {
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
            }, {
                params: t.Object({
                    uid: t.String(),
                    cid: t.String(),
                }),
            })
            app.use(messageRoute);
            return app;

        })
        return app;

    });
    return app;
}