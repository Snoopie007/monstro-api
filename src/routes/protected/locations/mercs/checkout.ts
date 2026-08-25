import type { Elysia } from "elysia";
import { t } from "elysia";
import { handleMercCheckout, mapMercCheckoutError } from "@/handlers/merc";
import { randomUUID } from "node:crypto";


export function locationMercsCheckout(app: Elysia) {
    return app.post("/mercs/checkout", async ({ params, status, body }) => {
        const { lid } = params;
        const { items, promoId, paymentMethodId, mid } = body;

        try {
            const order = await handleMercCheckout({
                lid,
                mid,
                items,
                paymentMethodId,
                promoId,
                attemptId: randomUUID(),
            });
            return status(200, order);
        } catch (error) {
            return mapMercCheckoutError(status, error);
        }
    }, {
        params: t.Object({
            lid: t.String(),
        }),
        body: t.Object({
            mid: t.String(),
            items: t.Array(t.Object({
                variantId: t.String(),
                quantity: t.Number(),
            })),
            promoId: t.Optional(t.Nullable(t.String())),
            paymentMethodId: t.String(),
        }),
    });
}
