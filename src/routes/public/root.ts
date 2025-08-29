import { Elysia } from "elysia";
import { planRoutes } from "./plan";
import { memberRoutes } from "./member";

export const PublicRoutes = new Elysia({ prefix: "/public" })
  .use(planRoutes)
  .use(memberRoutes);
