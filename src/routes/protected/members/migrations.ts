import { Elysia, t } from "elysia";
import { db } from "@/db/db";

const MigrationsProps = {
    params: t.Object({
        mid: t.String(),
    }),
};

export function migrationsRoutes(app: Elysia) {
    app.group('/migrations', (app) => {
        app.get('/', async ({ params, status }) => {
            const { mid } = params;
            try {
                const migrations = await db.query.migrateMembers.findMany({
                    where: (migrateMembers, { eq, and, isNull }) => and(
                        eq(migrateMembers.memberId, mid),
                        eq(migrateMembers.status, "pending"),
                        isNull(migrateMembers.acceptedOn),
                    ),
                    with: {
                        location: {
                            with: {
                                locationState: true,
                            },
                        },
                    },
                });
                return status(200, migrations);
            } catch (error) {
                console.error(error);
                return status(500, { error: 'Internal server error' });
            }
        }, MigrationsProps)
        return app;
    })
    return app;
}