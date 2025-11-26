import { db } from "@/db/db";
import Elysia from "elysia";

type ReactionProps = {
    memberId: string
    userId: string
    params: {
        ownerId: string
        ownerType: string
    }
    status: any
}
export const reactionsRoutes = new Elysia({ prefix: '/reactions/:ownerId' })
    .get('/', async ({ status, memberId, userId, params }: ReactionProps) => {

        const { ownerId } = params;
        try {
            const reactions = await db.query.reactions.findMany({
                where: (reactions, { eq }) => eq(reactions.ownerId, ownerId!),
            })
            return status(200, reactions);
        } catch (error) {
            console.error(error);
            return status(500, { error: 'Internal server error' });
        }
    })