import { Elysia } from "elysia";
import { docsRoutes } from "./loc";
import { migrationRoutes } from "./migrate";
import { appStatsRoutes } from "./app";
import { testRoutes } from "./test";
export const PublicRoutes = new Elysia({ prefix: "/public" })
  .use(migrationRoutes)
  .use(appStatsRoutes)
  .use(testRoutes)
  .group("/loc/:lid", (app) => {
    app.use(docsRoutes);
    return app;
  })
