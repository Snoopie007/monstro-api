import { Elysia } from "elysia";
import { docsRoutes } from "./loc";
import { migrationRoutes } from "./migrate";

export const PublicRoutes = new Elysia({ prefix: "/public" })
  .use(migrationRoutes)
  .group("/loc/:lid", (app) => {
    app.use(docsRoutes);
    return app;
  })
