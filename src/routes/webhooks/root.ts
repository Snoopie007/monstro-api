import { Elysia } from "elysia";
import { stripeWebhookRoutes } from "./stripe";
import { squareWebhookRoutes } from "./square";

export function webhooksRoutes(app: Elysia) {
    app.group("/webhooks", (app) => {
        app.use(stripeWebhookRoutes);
        app.use(squareWebhookRoutes);
        return app;
    });
    return app;
}