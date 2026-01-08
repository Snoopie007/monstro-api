
import { Elysia } from "elysia"
import { purchaseSubRoutes } from "./sub";



export function locationPurchaseRoutes(app: Elysia) {
    app.group('/purchase', (app) => {
        app.use(purchaseSubRoutes);
        return app;
    })
    return app;
}

