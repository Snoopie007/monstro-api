import { db } from "@/db/db";
import Elysia, { type Context } from "elysia"



export const stripeRoutes = new Elysia({ prefix: '/stripe' })

    .get('/publishable', async ({ status, ...ctx }) => {
        const { userId } = ctx as Context & { userId: string };
        if (userId && userId === 'usr_WL6ZRTHNTwe63G2RMYU0Xw') {
            return status(200, { key: process.env.STRIPE_TEST_PUBLIC_KEY });
        }
        return status(200, { key: process.env.STRIPE_PUBLIC_KEY });
    })
