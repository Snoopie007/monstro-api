import type { Elysia } from "elysia";
import { t } from "elysia";
import { handleMercCheckout, mapMercCheckoutError } from "@/handlers/merc";

export function locationMercsCheckout(app: Elysia) {
    return app.post("/mercs/checkout", async ({ params, status, body }) => {
        const { lid } = params;
        const { items, promoId, paymentMethodId, memberId } = body;

        try {
            const order = await handleMercCheckout({
                lid,
                mid: memberId,
                items,
                paymentMethodId,
                promoId,
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
            memberId: t.String(),
            items: t.Array(t.Object({
                variantId: t.String(),
                quantity: t.Number(),
            })),
            promoId: t.Optional(t.Nullable(t.String())),
            paymentMethodId: t.String(),
        }),
    });
}
