import { Elysia } from "elysia";
import { db } from "@/db/db";
import { WebAuthMiddleware } from "@/middlewares/WebAuthMW";
export const webGHLRoutes = new Elysia()
    .use(WebAuthMiddleware)
    .get("/ghl", async ({ params, status, lid }) => {
        if (!lid) {
            return status(401, { error: "Unauthorized" });
        }
        try {
            const ghl = await db.query.integrations.findFirst({
                where: (integration, { eq, and }) => and(
                    eq(integration.locationId, lid),
                    eq(integration.service, "gl")
                ),
            });
            if (!ghl) {
                return status(404, { error: "GHL integration not found" });
            }

            // if (ghl.expires && ghl.expires < Date.now() / 1000) {
            //     const highlevel = new Highlevel({
            //         apiKey: ghl.apiKey,
            //     });
            // }


            return status(200, ghl);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch GHL" });
        }
    });