import { db } from "@/db/db";
import { Elysia, t } from "elysia";




export const publicMercsRoutes = new Elysia({ prefix: "/mercs" })
    .get('/', async ({ params, status }) => {
        const { lid } = params;
        try {
            const products = await db.query.products.findMany({
                where: (p, { eq, and }) => and(eq(p.locationId, lid), eq(p.active, true)),
                with: {
                    variants: true,
                    images: true,
                },
            });

            return status(200, products);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch products" });
        }
    }, {
        params: t.Object({
            lid: t.String(),
        }),
    });