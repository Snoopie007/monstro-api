import { Elysia } from "elysia";
import { auth } from "@/libs/BetterAuth/config";
import { webOrderRoutes } from "./order";
import { webMercsRoutes } from "./merc";
import { webLocationSchedulesRoutes } from "./schedules";
import { webLocationStateRoutes } from "./LocationState";
import { webPlansRoutes } from "./plans";
import { webStripeGateway, webSquareGateway, webGatewaysRoutes } from "./gateways";
import { webContractRoutes } from "./contract";
import { webContentRoutes } from "./content";
const ACCEPTED_METHODS = ["GET", "POST"];

export const WebRoutes = new Elysia()
    .use(webOrderRoutes)
    .use(webMercsRoutes)
    .use(webLocationSchedulesRoutes)
    .use(webLocationStateRoutes)
    .use(webPlansRoutes)
    .use(webContractRoutes)
    .use(webContentRoutes)
    .group('/gateway', (app) => {
        app.use(webGatewaysRoutes)
        app.use(webStripeGateway)
        app.use(webSquareGateway)
        return app;
    })
    .all('/auth/*', ({ request, status }) => {
        if (!ACCEPTED_METHODS.includes(request.method)) {
            return status(405, { message: "Method not allowed" });
        }

        return auth.handler(request);
    });