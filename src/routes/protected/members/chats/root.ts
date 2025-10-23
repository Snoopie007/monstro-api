import { Elysia } from 'elysia';
import { db } from '@/db/db';
type Props = {
    memberId: string
    params: {
        mid: string
        cid: string
    },
    status: any
}



export const memberChats = new Elysia({ prefix: '/chats' })
    .get('/', async ({ params, status }: Props) => {

        try {

            const cms = await db.query.chatMembers.findMany({
                where: (chatMembers, { eq }) => eq(chatMembers.memberId, params.mid!),
            })

            const chatIds = [...new Set(cms.map((cm) => cm.chatId))];
            const chats = await db.query.chats.findMany({
                where: (chats, { inArray }) => inArray(chats.id, chatIds),
                with: {
                    chatMembers: {
                        with: {
                            member: true,
                        },
                    },
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
    })
    .group('/:cid', (app) => {
        app.get('/', async ({ params, status }: Props) => {
            const { cid, mid } = params;

            try {

                return status(200, []);
            } catch (error) {
                console.error(error);
                status(500, { error: 'Internal server error' });
                return { error: 'Internal server error' }
            }
        })
        return app;

    })
