import { db } from "@/db/db";
import { triggerNewMember } from "@/utils";
import { memberLocations, memberPasses } from "@subtrees/schemas";
import type { MemberPass } from "@subtrees/types";
import { and, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";

const OnboardingProps = {
    params: t.Object({
        lid: t.String(),
    }),
    body: t.Object({
        mid: t.String(),
    }),
};
export function onboardingRoutes(app: Elysia) {
    app.group('/onboard', (app) => {
        app.post('/', async ({ body, params, status }) => {
            const { lid } = params;
            const { mid } = body;
            try {

                // await triggerNewMember({ mid, lid });
                // create claimed reward

                const passPlan = await db.query.memberPlans.findFirst({
                    where: (mp, { eq, and }) => and(
                        eq(mp.locationId, lid),
                        eq(mp.type, "pass"),
                    ),
                    columns: {
                        id: true,
                        name: true,
                        description: true,
                    },
                });

                if (!passPlan) {
                    return status(200, { pass: null });
                }

                const [newPass] = await db.insert(memberPasses).values({
                    referrerId: mid,
                    locationId: lid,
                    planId: passPlan.id,
                }).returning()

                return status(200, {
                    pass: {
                        ...newPass,
                        plan: passPlan,
                    }
                });
            } catch (error) {
                console.error(error);
                return status(500, { error: 'Internal server error' });
            }
        }, OnboardingProps);
        app.post('/complete', async ({ body, params, status }) => {
            const { lid } = params;
            const { mid } = body;
            try {
                await triggerNewMember({ mid, lid });

                await db.update(memberLocations)
                    .set({ onboarded: true })
                    .where(and(eq(memberLocations.memberId, mid), eq(memberLocations.locationId, lid)));
                return status(200, { success: true });
            } catch (error) {
                console.error(error);
                return status(500, { error: 'Internal server error' });
            }
        }, OnboardingProps);
        return app;
    });
    return app;
}