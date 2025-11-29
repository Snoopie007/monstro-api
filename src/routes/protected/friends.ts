import { db } from "@/db/db"
import { Elysia } from "elysia"

type Props = {
    userId: string
    status: any
}

export const userFriends = new Elysia({ prefix: '/friends' })
    .get('/', async ({ userId, status }: Props) => {
        if (!userId) {
            return status(401, { error: "Unauthorized" });
        }
        try {
            const friends = await db.query.friends.findMany({
                where: (a, { eq, and }) => and(eq(a.requesterId, userId)),
                with: {
                    addressee: true,
                },
            });

            return status(200, friends);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch friends" });
        }
    })
