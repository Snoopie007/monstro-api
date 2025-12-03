import { db } from "@/db/db"
import { Elysia } from "elysia"
import { z } from "zod";
const MemberLocationAchievementsProps = {
    params: z.object({
        mid: z.string(),
        lid: z.string(),
    }),
};

export function mlAchievementsRoutes(app: Elysia) {
    return app.get('/achievements', async ({ params, status }) => {
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
    }, MemberLocationAchievementsProps)
}

