import { db } from "@/db/db"
import { Elysia } from "elysia"

type Props = {
    memberId: string
    status: any
}

export function memberFriends(app: Elysia) {
    return app.get('/friends', async ({ memberId, status }: Props) => {

        try {

            const friends = await db.query.friends.findMany({
                where: (a, { eq, and }) => and(eq(a.requesterId, memberId)),
                with: {
                    addressee: true,
                },
            });



            return status(200, friends);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch achievements" });
        }
    })
}

