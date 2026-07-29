import { Elysia, t } from "elysia";
import {
    addAuthorizePaymentMethod,
    getAuthorizePaymentMethods,
} from "@/handlers/paymentMethods";

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

export function AuthorizePaymentMethodsRoutes(app: Elysia) {
    app.get("/authorize", async ({ status, params, body }) => {
        const { mid, lid } = params;

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
    }, {
        params: t.Object({
            mid: t.String(),
            lid: t.String(),
        }),
    })
    app.post("/authorize", async ({ status, body, params }) => {
        const { mid, lid } = params;

        try {
            const pm = await addAuthorizePaymentMethod({
                mid,
                lid,
                opaqueData: body.opaqueData,
                name: body.name,
                address: body.address,
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
        params: t.Object({
            mid: t.String(),
            lid: t.String(),
        }),
        body: t.Object({
            opaqueData: t.Object({
                dataDescriptor: t.String(),
                dataValue: t.String(),
            }),
            name: t.Optional(t.String()),
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
    return app;
}
