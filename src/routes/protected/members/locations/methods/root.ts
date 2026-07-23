
import { Elysia } from "elysia";
import { StripePaymentMethodsRoutes } from "./stripe";
import { SquarePaymentMethodsRoutes } from "./square";
import { AuthorizePaymentMethodsRoutes } from "./authorize";

export function paymentMethodsRoutes(app: Elysia) {
    app.group('/methods', (app) => {
        app.use(StripePaymentMethodsRoutes)
        app.use(SquarePaymentMethodsRoutes)
        app.use(AuthorizePaymentMethodsRoutes)
        return app;
    })

    return app;
}