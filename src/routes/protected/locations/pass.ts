import { Elysia, t } from "elysia";
import { db } from "@/db/db";


const LocationPassProps = {
    params: t.Object({
        lid: t.String(),
    }),
    body: t.Object({
        planId: t.String(),
    }),
};

function locationPass(app: Elysia) {
    return app.post('/pass', async ({ params, body, status }) => {
        const { lid } = params;
        const { planId } = body;

        try {
            const pass = await db.query.memberPlans.findFirst({
                where: (memberPlans, { eq, and }) => and(
                    eq(memberPlans.id, planId),
                    eq(memberPlans.locationId, lid),
                    eq(memberPlans.family, false),
                ),
            });
        } catch (error) {
            console.error(error);
        }
        return status(200, { message: 'Pass' });
    }, LocationPassProps);
}