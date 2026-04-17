import { Elysia, t } from "elysia";
import { db } from "@/db/db";

export function publicLocationIntegration(app: Elysia) {
    return app.get('/integration/stripe', async ({ params, status }) => {
        const { lid } = params;
        try {
            const integration = await db.query.integrations.findFirst({
                where: (integration, { eq, and }) => and(
                    eq(integration.locationId, lid),
                    eq(integration.service, "stripe")
                ),
                columns: {
                    id: true,
                    apiKey: true,
                }
            });


            return status(200, { key: integration ? integration.apiKey : undefined });
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to get integration" });
        }
    }, {
        params: t.Object({
            lid: t.String(),
        }),
    });
}