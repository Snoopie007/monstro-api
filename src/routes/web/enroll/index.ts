import { Elysia } from "elysia";
import { webEnrollSubRoutes } from "./sub";
import { webEnrollPkgRoutes } from "./pkg";
import { webEnrollRequestRoutes } from "./request";

export const webEnrollRoutes = new Elysia()
    .use(webEnrollSubRoutes)
    .use(webEnrollPkgRoutes)
    .use(webEnrollRequestRoutes);
