import { Elysia } from "elysia";
import { auth } from "@/libs/BetterAuth/config";
import { webOrderRoutes } from "./order";
import { webMercsRoutes } from "./merc";
import { webLocationSchedulesRoutes } from "./schedules";
import { webLocationStateRoutes } from "./LocationState";
import { webPlansRoutes } from "./plans";
import { webStripeGateway, webSquareGateway, webGatewaysRoutes } from "./gateways";
import { webDocRoutes } from "./doc";
import { webContentRoutes } from "./content";
import { webGHLRoutes } from "./ghl";
import { webEnrollRoutes } from "./enroll";
const ACCEPTED_METHODS = ["GET", "POST"];

export const WebRoutes = new Elysia()
    .all('/*', ({ request, status }) => {
        if (!ACCEPTED_METHODS.includes(request.method)) {
            return status(405, { message: "Method not allowed" });
        }

        return auth.handler(request);
    })
    .use(webOrderRoutes)
    .use(webMercsRoutes)
    .use(webLocationSchedulesRoutes)
    .use(webLocationStateRoutes)
    .use(webPlansRoutes)
    .use(webDocRoutes)
    .use(webContentRoutes)
    .use(webGHLRoutes)
    .use(webEnrollRoutes)
    .group('/gateway', (app) => {
        app.use(webGatewaysRoutes)
        app.use(webStripeGateway)
        app.use(webSquareGateway)
        return app;
    });
