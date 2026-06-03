import { db } from "@/db/db";
import { Elysia, t } from "elysia";
import { WebAuthMiddleware } from "@/middlewares/WebAuthMW";
import { handleMercCheckout, mapMercCheckoutError } from "@/handlers/merc";

const mercCheckoutBody = t.Object({
    promoId: t.Optional(t.Nullable(t.String())),
    paymentMethodId: t.String(),
    items: t.Array(t.Object({
        variantId: t.String(),
        quantity: t.Number(),
    })),
});

export const webMercsRoutes = new Elysia({ prefix: "/mercs" })
    .use(WebAuthMiddleware)
    .get("/", async ({ status, lid }) => {
        if (!lid) {
            return status(401, { message: "No Location ID provided" });
        }

        try {
            const products = await db.query.products.findMany({
                where: (p, { eq, and }) => and(eq(p.locationId, lid), eq(p.active, true)),
                with: {
                    variants: true,
                    images: true,
                },
            });

            return status(200, products);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch products" });
        }
    })
    .post("/checkout", async ({ status, lid, session, body }) => {
        if (!lid) {
            return status(401, { message: "No Location ID provided" });
        }
        if (!session) {
            return status(401, { message: "Unauthorized" });
        }

        try {
            const order = await handleMercCheckout({
                lid,
                mid: session.user.memberId,
                items: body.items,
                paymentMethodId: body.paymentMethodId,
                promoId: body.promoId,
            });
            return status(200, order);
        } catch (error) {
            return mapMercCheckoutError(status, error);
        }
    }, { body: mercCheckoutBody });
