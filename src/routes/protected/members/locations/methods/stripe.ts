import { db } from "@/db/db";
import { Elysia, t } from "elysia";
import { and, eq } from "drizzle-orm";
import {
    getStripePaymentMethods,
    getStripeSetupIntent,
} from "@/handlers/paymentMethods";

const SharedProps = {
    params: t.Object({
        mid: t.String(),
        lid: t.String(),
    }),
};

const NOT_FOUND_ERRORS = new Set([
    "Stripe customer not found",
    "Stripe integration not found",
    "Location state not found",
    "Payment gateway not found",
    "Member location not found",
]);

export function StripePaymentMethodsRoutes(app: Elysia) {
    app.group("/stripe", (app) => {
        app.get("/", async ({ status, params }) => {
            const { mid, lid } = params;
            try {
                const paymentMethods = await getStripePaymentMethods(mid, lid);
                return status(200, paymentMethods);
            } catch (err) {
                console.log(err);
                if (err instanceof Error && NOT_FOUND_ERRORS.has(err.message)) {
                    return status(404, { error: err.message });
                }
                return status(500, { error: err });
            }
        }, SharedProps);

        app.delete("/:pmId", async ({ status }) => {
            try {
                return status(200, { success: true });
            } catch (err) {
                console.log(err);
                return status(500, { error: err });
            }
        }, {
            params: t.Object({
                mid: t.String(),
                lid: t.String(),
                pmId: t.String(),
            }),
        });

        app.get("/intent", async ({ status, params, query }) => {
            const { mid, lid } = params;
            const { ephemeralKey } = query;

            try {


                const result = await getStripeSetupIntent({
                    mid,
                    lid,
                    ephemeralKey,
                });

                return status(200, result);
            } catch (err) {
                console.log(err);
                if (err instanceof Error && NOT_FOUND_ERRORS.has(err.message)) {
                    return status(404, { error: err.message });
                }
                return status(500, { error: err });
            }
        }, {
            params: t.Object({
                mid: t.String(),
                lid: t.String(),
            }),
            query: t.Object({
                ephemeralKey: t.Optional(t.Boolean()),
            }),
        });

        return app;
    });

    return app;
}
