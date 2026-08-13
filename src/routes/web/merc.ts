import { db } from "@/db/db";
import { Elysia, t } from "elysia";
import { WebAuthMiddleware } from "@/middlewares/WebAuthMW";
import { handleMercCheckout, mapMercCheckoutError } from "@/handlers/merc";

const mercCheckoutBody = t.Object({
    promoId: t.Optional(t.Nullable(t.String())),
    paymentMethodId: t.String({ minLength: 1, maxLength: 256 }),
    paymentType: t.Optional(t.Union([
        t.Literal("card"),
        t.Literal("us_bank_account"),
    ])),
    items: t.Array(t.Object({
        variantId: t.String({ minLength: 1, maxLength: 128 }),
        quantity: t.Integer({ minimum: 1 }),
    }), { minItems: 1, maxItems: 100 }),
    attemptId: t.String({ minLength: 1, maxLength: 128 }),
    quoteOnly: t.Optional(t.Boolean()),
});
export function getActiveLocationProducts(locationId: string) {
    return db.query.products.findMany({
        where: (product, { and, eq }) => and(
            eq(product.locationId, locationId),
            eq(product.active, true),
        ),
        with: { variants: true, images: true },
    });
}

export function getActiveLocationProduct(locationId: string, productId: string) {
    return db.query.products.findFirst({
        where: (product, { and, eq }) => and(
            eq(product.id, productId),
            eq(product.locationId, locationId),
            eq(product.active, true),
        ),
        with: { variants: true, images: true },
    });
}

export const webMercsRoutes = new Elysia({ prefix: "/mercs" })
    .use(WebAuthMiddleware)
    .get("/", async ({ status, lid }) => {
        if (!lid) {
            return status(401, { message: "No Location ID provided" });
        }

        try {
            const products = await getActiveLocationProducts(lid);

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
                paymentType: body.paymentType,
                promoId: body.promoId,
                attemptId: body.attemptId,
                quoteOnly: body.quoteOnly,
            });
            return status(200, order);
        } catch (error) {
            return mapMercCheckoutError(status, error);
        }
    }, { body: mercCheckoutBody });
