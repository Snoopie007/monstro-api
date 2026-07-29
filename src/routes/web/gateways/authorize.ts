import { Elysia, t } from "elysia";
import {
    addAuthorizePaymentMethod,
    getAuthorizePaymentMethods,
} from "@/handlers/paymentMethods";
import { WebAuthMiddleware } from "@/middlewares/WebAuthMW";

const NOT_FOUND_ERRORS = new Set([
    "Authorize.net integration not found",
    "Authorize.net client configuration not found",
    "Member not found",
    "Member location not found",
]);

const BAD_REQUEST_ERRORS = new Set([
    "Invalid Authorize.net payment data",
    "Authorize.net customer profile does not belong to member",
    "Authorize.net did not return the saved card",
]);

export const webAuthorizeGateway = new Elysia()
    .use(WebAuthMiddleware)
    .get("/authorize", async ({ status, lid, session }) => {
        if (!lid) {
            return status(401, { error: "Unauthorized" });
        }
        if (!session) {
            return status(401, { error: "Unauthorized" });
        }
        const mid = session.user.memberId;

        try {
            const paymentMethods = await getAuthorizePaymentMethods(mid, lid);
            return status(200, paymentMethods);
        } catch (err) {
            console.log(err);
            if (err instanceof Error && NOT_FOUND_ERRORS.has(err.message)) {
                return status(404, { error: err.message });
            }
            return status(500, { error: err });
        }
    })
    .post("/authorize", async ({ status, body, lid, session }) => {
        if (!lid) {
            return status(401, { error: "Unauthorized" });
        }
        if (!session) {
            return status(401, { error: "Unauthorized" });
        }
        const mid = session.user.memberId;
        const { opaqueData, name, address } = body;


        try {
            const pm = await addAuthorizePaymentMethod({
                mid,
                lid,
                opaqueData,
                name,
                address,
            });

            return status(200, pm);
        } catch (err) {
            console.log(err);
            if (err instanceof Error) {
                if (NOT_FOUND_ERRORS.has(err.message)) {
                    return status(404, { error: err.message });
                }
                if (BAD_REQUEST_ERRORS.has(err.message)) {
                    return status(400, { error: err.message });
                }
            }
            return status(500, { error: err });
        }
    }, {
        body: t.Object({
            opaqueData: t.Object({
                dataDescriptor: t.String(),
                dataValue: t.String(),
            }),
            name: t.String(),
            address: t.Optional(t.Object({
                line1: t.String(),
                line2: t.Optional(t.String()),
                city: t.String(),
                state: t.String(),
                postalCode: t.String(),
                country: t.String(),
            })),
        }),
    });
