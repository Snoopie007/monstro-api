
import { Elysia } from "elysia";
import { StripePaymentMethodsRoutes } from "./stripe";
import { SquarePaymentMethodsRoutes } from "./square";

export function paymentMethodsRoutes(app: Elysia) {
    app.group('/methods', (app) => {
        app.use(StripePaymentMethodsRoutes)
        app.use(SquarePaymentMethodsRoutes)
        return app;
    })

    return app;
}