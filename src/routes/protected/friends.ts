import { db } from "@/db/db"
import { Elysia, type Context } from "elysia"
import { z } from "zod";

export const userFriends = new Elysia({ prefix: '/friends' })
    .get('/', async ({ params, body, status, ...ctx }) => {
        const { userId } = ctx as Context & { userId: string };
        if (!userId) {
            return status(401, { message: "Unauthorized", code: "UNAUTHORIZED" });
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
