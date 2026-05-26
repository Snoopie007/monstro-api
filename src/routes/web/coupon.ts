import { Elysia, t } from "elysia";
import { db } from "@/db/db";
import { WebAuthMiddleware } from "@/middlewares/WebAuthMW";



export const webCoupon = new Elysia({ prefix: "/coupon" })
    .use(WebAuthMiddleware)
    .get('/:code', async ({ params, status, lid }) => {
        const { code } = params;
        if (!lid) {
            return status(401, { message: "No Location ID provided" });
        }
        try {
            const promo = await db.query.promos.findFirst({
                where: (p, { eq, and }) => and(eq(p.locationId, lid), eq(p.code, code), eq(p.isActive, true)),
                columns: {
                    created: false,
                    updated: false,
                },
            });

            if (!promo) {
                return status(404, { code: 'PROMO_NOT_FOUND', message: 'Promotion code not found' });
            }

            return status(200, promo);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch coupons" });
        }
    }, {
        params: t.Object({
            code: t.String(),
        }),
    });