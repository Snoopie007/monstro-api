import { db } from "@/db/db"
import { Elysia, t } from "elysia"

export function mlPointsRoutes(app: Elysia) {
    return app.get('/points', async ({ params, status }) => {
        const { mid, lid } = params;
        try {

            const points = await db.query.memberPointsHistory.findMany({
                where: (a, { eq, and }) => and(eq(a.locationId, lid), eq(a.memberId, mid)),
            });

            return status(200, points);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch points" });
        }
    }, {
        params: t.Object({
            mid: t.String(),
            lid: t.String(),
        }),
    })
}

