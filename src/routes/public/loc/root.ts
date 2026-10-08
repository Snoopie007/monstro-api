import { Elysia, t } from "elysia";
import { publicLocationPaymentGateway } from "./PaymentGateway";
import { getLocationById } from "@/handlers/location";

export const publicLocationRoutes = new Elysia({ prefix: "/loc" })
    .group('/:lid', (app) => {

        app.get('/', async ({ params, status }) => {
            const { lid } = params;
            try {
                const location = await getLocationById(lid);
                if (!location) {
                    return status(404, { error: "Location not found" });
                }
                return status(200, location);
            } catch (error) {
                console.error("Failed to get location", error);
                return status(500, { error: "Failed to get location" });
            }
        }, {
            params: t.Object({
                lid: t.String(),
            }),
        });
        app.use(publicLocationPaymentGateway)
        return app;
    })
