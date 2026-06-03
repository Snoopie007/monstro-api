import { Elysia, t } from "elysia";
import { handleEnrollSubscription, mapEnrollSubError } from "@/handlers/enroll";

const EnrollSubProps = {
    params: t.Object({
        lid: t.String(),
    }),
    body: t.Object({
        mid: t.String(),
        paymentMethodId: t.String(),
        priceId: t.String(),
        promoId: t.Optional(t.Nullable(t.String())),
        paymentType: t.Union([
            t.Literal("card"),
            t.Literal("us_bank_account"),
        ]),
    }),
};

export function purchaseSubRoutes(app: Elysia) {
    app.group("/sub", (app) => {
        app.post("/", async ({ params, status, body }) => {
            const { lid } = params;
            const { mid, paymentMethodId, priceId, promoId, paymentType } = body;

            try {
                const result = await handleEnrollSubscription({
                    lid,
                    mid,
                    priceId,
                    paymentMethodId,
                    paymentType,
                    promoId,
                });
                return status(200, result);
            } catch (error) {
                return mapEnrollSubError(status, error);
            }
        }, EnrollSubProps);

        return app;
    });

    return app;
}
