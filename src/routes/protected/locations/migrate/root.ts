
import { Elysia } from "elysia"
import { migrateSubRoutes } from "./sub";
import { migratePkgRoutes } from "./pkg";



export function locationMigrateRoutes(app: Elysia) {
    app.group('/migrate', (app) => {
        app.use(migrateSubRoutes);
        app.use(migratePkgRoutes);
        return app;
    })
    return app;
}

