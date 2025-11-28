import { db } from "@/db/db";
import { reactions } from "@/db/schemas/chat";
import Elysia from "elysia";
import type { ReactionEmoji } from "@/types";
import { and, eq } from "drizzle-orm";

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

        if (!userId || !display || !type || !name || !userName) {
            return status(400, { error: 'All fields are required' });
        }

        const today = Date.now();
        try {

            const newEmoji: ReactionEmoji = {
                value: display,
                type: type ? type.toLowerCase() : 'unicode',
                name: name,
            }
            await db.insert(reactions).values({
                ownerId,
                userId,
                emoji: newEmoji,
                ownerType: ownerType.toLowerCase(),
            });
            return status(200, {
                ...newEmoji,
                ownerType,
                userId,
                ownerId,
                userIds: [userId],
                count: 1,
                userNames: [userName],
                created: today,
            });
        } catch (error) {
            console.error(error);
            return status(500, { error: 'Internal server error' });
        }
    }).delete('/', async ({ params, status }: ReactionProps) => {
        const { ownerId, ownerType } = params;
        if (!['message', 'post', 'moment'].includes(ownerType)) {
            return status(400, { error: 'Invalid owner type' });
        }
        try {
            await db.delete(reactions).where(and(
                eq(reactions.ownerId, ownerId),
                eq(reactions.ownerType, ownerType)
            ));
            return status(200, { message: 'Reaction deleted' });
        } catch (error) {
            console.error(error);
            return status(500, { error: 'Internal server error' });
        }
    })