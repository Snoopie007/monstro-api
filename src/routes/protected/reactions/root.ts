import { db } from "@/db/db";
import Elysia from "elysia";
import type { ReactionEmoji } from "@/types";
import { sql } from "drizzle-orm";

type ReactionProps = {
    memberId: string
    userId: string
    params: {
        ownerType: string
        ownerId: string
    }
    status: any
}

type PostBody = {
    display: string,
    type: string,
    name: string,
    userId: string,
    userName: string,
}
export const reactionRoutes = new Elysia({ prefix: '/reactions/:ownerType/:ownerId' })
    .post('/', async ({ status, params, body }: ReactionProps & { body: PostBody }) => {

        const { ownerId, ownerType } = params;
        const { display, type, name, userId, userName } = body;

        if (!['message', 'post', 'moment'].includes(ownerType)) {
            return status(400, { error: 'Invalid owner type' });
        }

        if (!userId || !display || !name || !userName) {
            return status(400, { error: 'All fields are required' });
        }

        try {

            const newEmoji: ReactionEmoji = {
                value: display,
                type: type ? type.toLowerCase() : 'emoji',
                name: name,
            }
            // Call the PostgreSQL toggle_reaction function
            const res = await db.execute(
                sql`SELECT toggle_reaction(
                ${userId}, ${ownerType.toLowerCase()}, ${ownerId},
                 ${JSON.stringify(newEmoji)}::jsonb) as added`
            );

            const isAdded = res[0]?.added;
            if (isAdded) {
                const reaction = {
                    ownerType,
                    ownerId,
                    display,
                    type,
                    name,
                    userIds: [userId],
                    userNames: [userName],
                    created: new Date(),
                    count: 1,
                }
                return status(200, { reaction });
            } else {

                return status(200, { deleted: true });
            }
        } catch (error) {
            console.error(error);
            return status(500, { error: 'Internal server error' });
        }
    })