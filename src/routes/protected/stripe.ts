import { db } from "@/db/db";
import Elysia, { type Context } from "elysia"



export const stripeRoutes = new Elysia({ prefix: '/stripe' })

    .get('/:lid/publishable', async ({ status, params, ...ctx }) => {
        const { memberId, userId } = ctx as Context & { memberId: string, userId: string };
        const { lid } = params;

        let hasIntegration = false;
        const integration = await db.query.integrations.findFirst({
            where: (integration, { eq, and }) => and(eq(integration.locationId, lid), eq(integration.service, "stripe")),
        });
        if (integration) {
            hasIntegration = true;
        }
        if (userId && userId === 'usr_WL6ZRTHNTwe63G2RMYU0Xw') {
            return status(200, { key: process.env.STRIPE_TEST_PUBLIC_KEY, hasIntegration })
        }


        return status(200, { key: process.env.STRIPE_PUBLIC_KEY, hasIntegration })
    })