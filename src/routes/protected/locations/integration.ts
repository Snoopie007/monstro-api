import Elysia, { t } from "elysia";
import { db } from "@/db/db";
import { and, eq } from "drizzle-orm";

export function locationIntegrationRoutes(app: Elysia) {
    app.group('/integration', (app) => {
        app.get('/stripe', async ({ status, params }) => {
            const { lid } = params;
            const integration = await db.query.integrations.findFirst({
                where: (integration, { eq }) => and(eq(integration.locationId, lid), eq(integration.service, "stripe")),
                columns: { id: true }
            });

            const hasIntegration = integration ? true : false;

            return status(200, { hasIntegration });
        }, {
            params: t.Object({
                lid: t.String(),
            }),
        })
        return app;
    })
    return app;
}