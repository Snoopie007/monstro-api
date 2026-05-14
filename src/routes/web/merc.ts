import { db } from "@/db/db";
import { Elysia, t } from "elysia";
import { WebAuthMiddleware } from "@/middlewares/WebAuthMW";



export const webMercsRoutes = new Elysia({ prefix: "/mercs" })
    .use(WebAuthMiddleware)
    .get('/', async ({ params, status, lid, isAuthenticated, session }) => {

        try {
            // const products = await db.query.products.findMany({
            //     where: (p, { eq, and }) => and(eq(p.locationId, lid), eq(p.active, true)),
            //     with: {
            //         variants: true,
            //         images: true,
            //     },
            // });

            return status(200, []);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch products" });
        }
    });