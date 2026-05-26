import { Elysia } from "elysia";
import { WebAuthMiddleware } from "@/middlewares/WebAuthMW";

export const webOrderRoutes = new Elysia({ prefix: "/orders" })
    .use(WebAuthMiddleware)
    .post('/', async ({ status, lid, isAuthenticated, session }) => {
        if (!isAuthenticated || !session) {
            return status(401, { message: "Unauthorized" });
        }

        if (!lid) {
            return status(401, { message: "No Location ID provided" });
        }

        try {
            return status(200, { message: "Order created" });
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch orders" });
        }
    });