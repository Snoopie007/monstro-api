
import { Elysia } from "elysia"
import { purchaseSubRoutes } from "./sub";
import { purchasePkgRoutes } from "./pkg";



export function locationPurchaseRoutes(app: Elysia) {
    app.group('/purchase', (app) => {
        app.use(purchaseSubRoutes);
        app.use(purchasePkgRoutes);
        return app;
    })
    return app;
}

