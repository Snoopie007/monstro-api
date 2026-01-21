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
                const migration = await db.query.migrateMembers.findFirst({
                    where: (migrateMembers, { eq }) => eq(migrateMembers.id, migrateId),
                    with: {
                        location: true,
                        pricing: true,
                    },
                });
                if (!migration) {
                    return status(404, { error: "Migration not found" });
                }
                return status(200, migration);
            } catch (error) {
                return status(500, { error: "Failed to get migrate" });
            }
        }, MigrateProps);


        return app;
    });