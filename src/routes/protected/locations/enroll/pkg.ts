import { Elysia, t } from "elysia";
import { handleEnrollPackage, mapEnrollPkgError } from "@/handlers/enroll";

const EnrollPkgProps = {
    params: t.Object({
        lid: t.String(),
    }),
    body: t.Object({
        paymentMethodId: t.String(),
        priceId: t.String(),
        mid: t.String(),
        paymentType: t.Union([
            t.Literal("card"),
            t.Literal("us_bank_account"),
        ]),
        promoId: t.Optional(t.String()),
    }),
};

export function purchasePkgRoutes(app: Elysia) {
    app.group("/pkg", (app) => {
        app.post("/", async ({ params, status, body }) => {
            const { lid } = params;
            const {
                paymentMethodId,
                mid,
                priceId,
                promoId,
                paymentType,
            } = body;

            try {
                const result = await handleEnrollPackage({
                    lid,
                    mid,
                    priceId,
                    paymentMethodId,
                    paymentType,
                    promoId,
                });
                return status(200, result);
            } catch (error) {
                return mapEnrollPkgError(status, error);
            }
        }, EnrollPkgProps);

        return app;
    });

    return app;
}
