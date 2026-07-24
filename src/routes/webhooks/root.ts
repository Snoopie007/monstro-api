import { Elysia } from "elysia";
import { stripeWebhookRoutes } from "./stripe";
import { squareWebhookRoutes } from "./square";
import { authorizeWebhookRoutes } from "./authorize";

export function webhooksRoutes(app: Elysia) {
    app.group("/webhooks", (app) => {
        app.use(stripeWebhookRoutes);
        app.use(squareWebhookRoutes);
        app.use(authorizeWebhookRoutes);
        return app;
    });
    return app;
}