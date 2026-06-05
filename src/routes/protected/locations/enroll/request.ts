import { Elysia, t } from "elysia";
import { handleEnrollPackage, mapEnrollPkgError } from "@/handlers/enroll";

const EnrollRequestProps = {
    params: t.Object({
        lid: t.String(),
    }),
    body: t.Object({
        priceId: t.String(),
    }),
};

export function enrollRequestRoutes(app: Elysia) {
    app.group("/request", (app) => {
        app.post("/", async ({ params, status, body }) => {
            const { lid } = params;
            const { priceId, } = body;

            try {

                return status(200, { success: true });
            } catch (error) {
                return mapEnrollPkgError(status, error);
            }
        }, EnrollRequestProps);

        return app;
    });

    return app;
}
