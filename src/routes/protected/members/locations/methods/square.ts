import { db } from "@/db/db";
import { Elysia, t } from "elysia";
import {
    addSquarePaymentMethod,
    getSquareErrorMessage,
    getSquarePaymentMethods,
} from "@/handlers/paymentMethods";
import { SquareError } from "square";

const SharedProps = {
    params: t.Object({
        mid: t.String(),
        lid: t.String(),
    }),
};

const NOT_FOUND_ERRORS = new Set([
    "Square integration not found",
    "Member location not found",
]);

export function SquarePaymentMethodsRoutes(app: Elysia) {
    app.group("/square", (app) => {
        app.get("/", async ({ status, params }) => {
            const { mid, lid } = params;
            try {
                const paymentMethods = await getSquarePaymentMethods(mid, lid);
                return status(200, paymentMethods);
            } catch (err) {
                console.log(err);
                if (err instanceof Error && NOT_FOUND_ERRORS.has(err.message)) {
                    return status(404, { error: err.message });
                }
                return status(500, { error: err });
            }
        }, SharedProps);

        app.delete("/:paymentMethodId", async ({ status }) => {
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
                paymentMethodId: t.String(),
            }),
        });

        app.post("/", async ({ status, body, params }) => {
            const { mid, lid } = params;
            const { nonce } = body;

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
                }
                return status(500, { error: err });
            }
        }, {
            params: t.Object({
                mid: t.String(),
                lid: t.String(),
            }),
            body: t.Object({
                nonce: t.String(),
            }),
        });

        return app;
    });

    return app;
}
