
import { Elysia, t } from "elysia"
import { migrateSubRoutes } from "./sub";
import { migratePkgRoutes } from "./pkg";
import { db } from "@/db/db";



export function locationMigrateRoutes(app: Elysia) {
    app.group('/migrate', (app) => {
        app.use(migrateSubRoutes);
        app.use(migratePkgRoutes);


        return app;
    })
    return app;
}

