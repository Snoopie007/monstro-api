import { db } from "@/db/db";
import { reactions } from "@/db/schemas/chat";
import Elysia from "elysia";
import type { ReactionEmoji } from "@/types";

type ReactionProps = {
    memberId: string
    userId: string
    params: {
        ownerId: string
    }
    status: any
}

type PostBody = {
    emoji: ReactionEmoji,
    ownerType: string,
    userId: string,
    userName: string,
}
export const reactionRoutes = new Elysia({ prefix: '/reactions/:ownerId' })
    .post('/', async ({ status, params, body }: ReactionProps & { body: PostBody }) => {
        const { ownerId } = params;
        const { emoji, ownerType, userId, userName } = body;
        if (!userName || !userId || !ownerType || !emoji) {
            return status(400, { error: 'All fields are required' });
        }
        const today = Date.now();
        try {

            const newEmoji = {
                ...emoji,
                type: emoji.type ? emoji.type.toLowerCase() : 'unicode',
            }
            await db.insert(reactions).values({
                ownerId,
                userId,
                emoji: newEmoji,
                ownerType: ownerType.toLowerCase(),
            });
            return status(200, {
                ...newEmoji,
                ownerType: ownerType.toLowerCase(),
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
    })