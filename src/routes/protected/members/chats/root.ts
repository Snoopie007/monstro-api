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

const DummyChats = [
    {
        id: '1',
        name: 'Chat 1',
        chatMembers: [{
            member: {
                id: '234234234234234234',
                firstName: 'Member 1',
                lastName: 'Member 1',
                avatar: 'https://via.placeholder.com/150',
            },
        }],
        startedBy: {
            id: '1',
            firstName: 'Member 1',
            lastName: 'Member 1',
            avatar: 'https://via.placeholder.com/150',
        },
        created: new Date(),
    }
]

export const memberChats = new Elysia({ prefix: '/chats' })
    .get('/', async ({ params, status }: Props) => {

        try {
            const chats = await db.query.chats.findMany({
                where: (chats, { eq }) => eq(chats.startedBy, params.mid!),
                with: {
                    started: true,
                    chatMembers: {
                        with: {
                            member: true,
                        },
                    },
                },
            })
            if (chats.length === 0) {
                return status(200, DummyChats);
            }

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
