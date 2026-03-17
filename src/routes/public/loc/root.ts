import { Elysia, t } from "elysia";
import { publicDocsRoutes } from "./docs";
import { publicLocationPromos } from "./promo";
import { publicLocationPlans } from "./plans";
import { db } from "@/db/db";

export const publicLocationRoutes = new Elysia({ prefix: "/loc" })
    .group('/:lid', (app) => {

        app.get('/', async ({ params, status }) => {
            const { lid } = params;
            try {
                const location = await db.query.locations.findFirst({
                    where: (l, { eq }) => eq(l.id, lid),
                });
                return status(200, location);
            } catch (error) {
                console.error("Failed to get location", error);
                return status(500, { error: "Failed to get location" });
            }
        }, {
            params: t.Object({
                lid: t.String(),
            }),
        });
        app.use(publicDocsRoutes)
        app.use(publicLocationPromos)
        app.use(publicLocationPlans)
        return app;
    })
