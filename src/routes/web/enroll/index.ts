import { Elysia } from "elysia";
import { webEnrollSubRoutes } from "./sub";
import { webEnrollPkgRoutes } from "./pkg";

export const webEnrollRoutes = new Elysia()
    .use(webEnrollSubRoutes)
    .use(webEnrollPkgRoutes);
