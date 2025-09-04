import { Elysia } from "elysia";
import { planRoutes } from "./plan";
import { memberRoutes } from "./member";
import { PublicChatRoutes } from "./chat";

export const PublicRoutes = new Elysia({ prefix: "/public" })
  .use(planRoutes)
  .use(memberRoutes)
  .use(PublicChatRoutes);
