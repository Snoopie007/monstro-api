import type { Elysia } from "elysia";
import { z } from "zod";
import { handlePromo } from "@/handlers/promo";

const LocationPromosProps = {
    params: z.object({
        lid: z.string(),
        code: z.string(),
    }),
};

export function locationPromos(app: Elysia) {
    return app.get('/promos/:code', async ({ params, status }) => {
        const { lid, code } = params;
        try {
            const promo = await handlePromo(lid, code);

            if (!promo) {
                return status(404, { code: 'PROMO_NOT_FOUND', message: 'Promotion code not found' });
            }

            return status(200, promo);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch coupons" });
        }
    }, LocationPromosProps);
}
