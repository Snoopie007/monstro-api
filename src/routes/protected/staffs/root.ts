import { Elysia } from "elysia";
import { staffLocationsRoutes } from "./locations/root";

export const staffsRoutes = new Elysia({ prefix: "/staff" })
    .group("/:staffId", (app) => {
        app.use(staffLocationsRoutes);
        return app;
    });
