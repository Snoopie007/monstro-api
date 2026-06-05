
import { Elysia } from "elysia"
import { subEnrollRoutes } from "./sub";
import { pkgEnrollRoutes } from "./pkg";
import { enrollRequestRoutes } from "./request";



export function locationEnrollRoutes(app: Elysia) {
    app.group('/enroll', (app) => {
        app.use(subEnrollRoutes);
        app.use(pkgEnrollRoutes);
        app.use(enrollRequestRoutes);
        return app;
    })
    return app;
}

