import { Elysia, t } from "elysia";
import { db } from "@/db/db";

const PublicLocationPromosProps = {
    params: t.Object({
        lid: t.String(),
        code: t.String(),
    }),
};

export function publicLocationPromos(app: Elysia) {
    return app.get('/promos/:code', async ({ params, status }) => {
        const { lid, code } = params;
        try {
            const promo = await db.query.promos.findFirst({
                where: (p, { eq, and }) => and(eq(p.locationId, lid), eq(p.code, code), eq(p.isActive, true)),
                columns: {
                    stripeCouponId: false,
                    stripePromoId: false,
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
    }, PublicLocationPromosProps);
}