import { Elysia } from 'elysia';
import { db } from '@/db/db';


type ChatProps = {
    memberId: string
    params: {
        mid: string
        cid: string
    },
    status: any
}



export function memberChats(app: Elysia) {
    return app.get('/chats', async ({ params, status }: ChatProps) => {

        try {

            const member = await db.query.members.findFirst({
                where: (members, { eq }) => eq(members.id, params.mid!),
            })

            const cms = await db.query.chatMembers.findMany({
                where: (chatMembers, { eq }) => eq(chatMembers.userId, member?.userId!),
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
    }).group('/chats/:cid', (app) => {
        app.get('/', async ({ params, status }: ChatProps) => {
            const { cid, mid } = params;

            try {
                const chat = await db.query.chats.findFirst({
                    where: (chats, { eq }) => eq(chats.id, cid),
                    with: {
                        group: true,
                        messages: {
                            orderBy: (messages, { desc }) => desc(messages.created),
                            limit: 100,
                            with: {
                                sender: true,
                            },
                        },
                    },
                })

                return status(200, chat);
            } catch (error) {
                console.error(error);
                status(500, { error: 'Internal server error' });
                return { error: 'Internal server error' }
            }
        })
        return app;

    })
}

