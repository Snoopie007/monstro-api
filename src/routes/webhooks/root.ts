import { Elysia } from "elysia";
import { stripeWebhookRoutes } from "./stripe";

export function webhooksRoutes(app: Elysia) {
    app.group("/webhooks", (app) => {
        app.use(stripeWebhookRoutes);
        return app;
    });
    return app;
}