import { db } from "@/db/db"
import { Elysia, t } from "elysia"

const MigrateProps = {
    params: t.Object({
        migrateId: t.String(),
    }),
}

export const migrationRoutes = new Elysia({ prefix: '/migrate' })
    .group('/:migrateId', (app) => {
        app.get('/', async ({ params, status }) => {
            const { migrateId } = params;
            try {
                const migrate = await db.query.importMembers.findFirst({
                    where: (importMembers, { eq }) => eq(importMembers.id, migrateId),
                    with: {
                        location: true,
                        pricing: true,
                    },
                });
                if (!migrate) {
                    return status(404, { error: "Migrate not found" });
                }
                return status(200, migrate);
            } catch (error) {
                return status(500, { error: "Failed to get migrate" });
            }
        }, MigrateProps);


        return app;
    });