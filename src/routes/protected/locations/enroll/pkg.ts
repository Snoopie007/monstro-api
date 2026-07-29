import { Elysia, t } from "elysia";
import { randomUUID } from "node:crypto";
import { handleEnrollPackage, mapEnrollPkgError } from "@/handlers/enroll";

const EnrollPkgProps = {
    params: t.Object({
        lid: t.String(),
    }),
    body: t.Object({
        paymentMethodId: t.String(),
        priceId: t.String(),
        mid: t.String(),
        attemptId: t.Optional(t.String()),
        memberPlanId: t.Optional(t.String()),
        paymentType: t.Union([
            t.Literal("card"),
            t.Literal("us_bank_account"),
        ]),
        promoId: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        expireDate: t.Optional(t.String()),
        totalClassLimit: t.Optional(t.Number({ minimum: 0 })),
    }),
};

export function pkgEnrollRoutes(app: Elysia) {
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
                    attemptId: body.attemptId ?? randomUUID(),
                    startDate: body.startDate,
                    expireDate: body.expireDate,
                    totalClassLimit: body.totalClassLimit,
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
