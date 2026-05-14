import { Elysia } from "elysia";
import { auth } from "@/libs/BetterAuth/config";
import { webOrderRoutes } from "./order";
import { webMercsRoutes } from "./merc";
import { WebAuthMiddleware } from "@/middlewares/WebAuthMW";

const ACCEPTED_METHODS = ["GET", "POST"];

export const WebRoutes = new Elysia()
    .use(webOrderRoutes)
    .use(webMercsRoutes)
    .all('/auth/*', ({ request, status }) => {
        if (!ACCEPTED_METHODS.includes(request.method)) {
            return status(405, { message: "Method not allowed" });
        }

        return auth.handler(request);
    });