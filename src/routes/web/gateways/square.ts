
import { Elysia, t } from "elysia";
import {
    addSquarePaymentMethod,
    getSquareErrorMessage,
    getSquarePaymentMethods,
} from "@/handlers/paymentMethods";
import { WebAuthMiddleware } from "@/middlewares/WebAuthMW";
import { SquareError } from "square";

const NOT_FOUND_ERRORS = new Set([
    "Square integration not found",
    "Member location not found",
]);

export const webSquareGateway = new Elysia()
    .use(WebAuthMiddleware)
    .get("/square", async ({ status, lid, session }) => {
        if (!lid) {
            return status(401, { error: "Unauthorized" });
        }
        if (!session) {
            return status(401, { error: "Unauthorized" });
        }

        try {
            const paymentMethods = await getSquarePaymentMethods(session.user.memberId, lid);
            return status(200, paymentMethods);
        } catch (err) {
            console.log(err);
            if (err instanceof Error && NOT_FOUND_ERRORS.has(err.message)) {
                return status(404, { error: err.message });
            }
            return status(500, { error: err });
        }
    })
    .post("/square", async ({ status, body, lid, session }) => {
        if (!lid) {
            return status(401, { error: "Unauthorized" });
        }
        if (!session) {
            return status(401, { error: "Unauthorized" });
        }

        const { nonce } = body;
        const mid = session.user.memberId;
        try {

            const pm = await addSquarePaymentMethod({
                mid,
                lid,
                nonce,
            });

            return status(200, pm);
        } catch (err) {
            console.log(err);
            if (err instanceof SquareError) {
                return status(500, { error: getSquareErrorMessage(err) });
            }
            if (err instanceof Error) {
                if (NOT_FOUND_ERRORS.has(err.message)) {
                    return status(404, { error: err.message });
                }
                if (err.message === "Customer ID not found" || err.message === "Failed to create card") {
                    return status(400, { error: err.message });
                }
                if (err.message === "Failed to create customer") {
                    return status(500, { error: err.message });
                }
                if (err.message === "Member location not found") {
                    return status(404, { error: err.message });
                }
            }
            return status(500, { error: err });
        }
    }, {
        body: t.Object({
            nonce: t.String(),
        }),
    });
