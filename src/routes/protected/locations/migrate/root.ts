
import { Elysia } from "elysia"
import { migrateSubRoutes } from "./sub";
import { migratePkgRoutes } from "./pkg";
import { migrateAcceptRoutes } from "./accept";



export function locationMigrateRoutes(app: Elysia) {
    app.group('/migrate/:migrateId', (app) => {
        app.use(migrateSubRoutes);
        app.use(migratePkgRoutes);
        app.use(migrateAcceptRoutes);
        return app;
    })
    return app;
}

