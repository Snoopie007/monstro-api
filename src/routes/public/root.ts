import { Elysia } from "elysia";
import { docsRoutes } from "./loc";

export const PublicRoutes = new Elysia({ prefix: "/public" })
  .group("/loc/:lid", (app) => {
    app.use(docsRoutes);
    return app;
  })

