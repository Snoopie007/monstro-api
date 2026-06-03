import { Elysia, t } from "elysia";
import { WebAuthMiddleware } from "@/middlewares/WebAuthMW";
import { handleEnrollPackage, mapEnrollPkgError } from "@/handlers/enroll";

const EnrollPkgBody = t.Object({
    paymentMethodId: t.String(),
    priceId: t.String(),
    memberPlanId: t.String(),
    promoId: t.Optional(t.Nullable(t.String())),
    paymentType: t.Union([
        t.Literal("card"),
        t.Literal("us_bank_account"),
    ]),
});

export const webEnrollPkgRoutes = new Elysia({ prefix: "/enroll" })
    .use(WebAuthMiddleware)
    .post("/pkg", async ({ status, lid, session, body }) => {
        if (!lid) {
            return status(401, { message: "No Location ID provided" });
        }
        if (!session) {
            return status(401, { message: "Unauthorized" });
        }

        try {
            const result = await handleEnrollPackage({
                lid,
                mid: session.user.memberId,
                priceId: body.priceId,
                memberPlanId: body.memberPlanId,
                paymentMethodId: body.paymentMethodId,
                paymentType: body.paymentType,
                promoId: body.promoId,
            });
            return status(200, result);
        } catch (error) {
            return mapEnrollPkgError(status, error);
        }
    }, { body: EnrollPkgBody });
