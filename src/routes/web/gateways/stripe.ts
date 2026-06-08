import { db } from "@/db/db";
import { Elysia, t } from "elysia";
import {
    getStripePaymentMethods,
    getStripeSetupIntent,
} from "@/handlers/paymentMethods";
import { WebAuthMiddleware } from "@/middlewares/WebAuthMW";

const NOT_FOUND_ERRORS = new Set([
    "Member not found",
    "Member location not found",
    "Stripe customer not found",
    "Stripe integration not found",
    "Location state not found",
    "Payment gateway not found",
]);

export const webStripeGateway = new Elysia()
    .use(WebAuthMiddleware)
    .get("/stripe", async ({ status, lid, session }) => {
        if (!lid) {
            return status(401, { error: "Unauthorized" });
        }
        if (!session) {
            return status(401, { error: "Unauthorized" });
        }

        const mid = session.user.memberId;

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
    })
    .get("/stripe/intent", async ({ status, query, lid, session }) => {
        if (!lid) {
            return status(401, { error: "Unauthorized" });
        }
        if (!session) {
            return status(401, { error: "Unauthorized" });
        }

        const { ephemeralKey } = query;
        const mid = session.user.memberId;
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
        query: t.Object({
            ephemeralKey: t.Optional(t.Boolean()),
        }),
    });
