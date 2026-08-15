import { randomUUID } from "node:crypto";
import { Elysia, t } from "elysia";
import { WebAuthMiddleware } from "@/middlewares/WebAuthMW";
import { handleEnrollPackage, handleEnrollSubscription, mapEnrollSubError } from "@/handlers/enroll";

const EnrollSubBody = t.Object({
    paymentMethodId: t.String(),
    priceId: t.String(),
    attemptId: t.String(),
    promoId: t.Optional(t.Nullable(t.String())),
    paymentType: t.Union([
        t.Literal("card"),
        t.Literal("us_bank_account"),
    ]),
});

const EnrollQuoteBody = t.Object({
    priceId: t.String(),
    promoId: t.Optional(t.Nullable(t.String())),
    paymentType: t.Union([
        t.Literal("card"),
        t.Literal("us_bank_account"),
    ]),
    planType: t.Union([
        t.Literal("recurring"),
        t.Literal("one-time"),
    ]),
});

export const webEnrollSubRoutes = new Elysia({ prefix: "/enroll" })
    .use(WebAuthMiddleware)
    .post("/quote", async ({ status, lid, session, body }) => {
        if (!lid) {
            return status(401, { message: "No Location ID provided" });
        }
        if (!session) {
            return status(401, { message: "Unauthorized" });
        }

        try {
            const handler = body.planType === "recurring" ? handleEnrollSubscription : handleEnrollPackage;
            const result = await handler({
                lid,
                mid: session.user.memberId,
                priceId: body.priceId,
                paymentMethodId: "quote",
                paymentType: body.paymentType,
                promoId: body.promoId,
                attemptId: randomUUID(),
                quoteOnly: true,
            });
            return status(200, result);
        } catch (error) {
            return mapEnrollSubError(status, error);
        }
    }, { body: EnrollQuoteBody })
    .post("/sub", async ({ status, lid, session, body }) => {
        if (!lid) {
            return status(401, { message: "No Location ID provided" });
        }
        if (!session) {
            return status(401, { message: "Unauthorized" });
        }

        const mid = session.user.memberId;

        try {
            const result = await handleEnrollSubscription({
                lid,
                mid,
                priceId: body.priceId,
                paymentMethodId: body.paymentMethodId,
                paymentType: body.paymentType,
                promoId: body.promoId,
                attemptId: body.attemptId,
            });
            return status(200, result);
        } catch (error) {
            return mapEnrollSubError(status, error);
        }
    }, { body: EnrollSubBody });
