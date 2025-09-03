import { db } from "@/db/db"
import { getTableColumns } from "drizzle-orm"
import { Elysia } from "elysia"

type Props = {
    memberId: string
    params: {
        mid: string
        lid: string
    },
    status: any
}

export function mlAchievementsRoutes(app: Elysia) {
    return app.get('/achievements', async ({ memberId, params, status }: Props) => {
        const { mid, lid } = params;
        try {

            const achievements = await db.query.memberAchievements.findMany({
                where: (a, { eq, and }) => and(eq(a.locationId, lid), eq(a.memberId, mid)),
                with: {
                    achievement: true,
                },
            });





            return status(200, achievements);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch achievements" });
        }
    })
}

