import { db } from "@/db/db";
import { Elysia, t } from "elysia";

const MemberLocationPassesProps = {
    params: t.Object({
        mid: t.String(),
        lid: t.String(),
    }),
};
export function memberLocationPassesRoutes(app: Elysia) {
    return app.get('/passes', async ({ params, status }) => {
        const { mid, lid } = params;
        try {
            const passes = await db.query.memberPasses.findMany({
                where: (mp, { eq, and }) => and(eq(mp.referrerId, mid), eq(mp.locationId, lid)),
                with: {
                    plan: {
                        columns: {
                            id: true,
                            name: true,
                            description: true,
                        },
                    },
                },
            });
            return status(200, passes);
        } catch (error) {
            console.error(error);
            return status(500, { error: 'Internal server error' });
        }
    }, MemberLocationPassesProps);
}