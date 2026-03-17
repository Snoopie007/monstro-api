import { Elysia } from "elysia";  
import { publicLocationRoutes } from "./loc";
import { migrationRoutes } from "./migrate";
import { appStatsRoutes } from "./app";
import { testRoutes } from "./test";
import { publicPassRoutes } from "./pass";
import { publicStripeRoutes } from "./stripe";
import { publicFamilyRoutes } from "./family";

export const PublicRoutes = new Elysia({ prefix: "/public" })
  .use(migrationRoutes)
  .use(appStatsRoutes)
  .use(publicLocationRoutes)
  .use(publicPassRoutes)
  .use(publicStripeRoutes)
  .use(publicFamilyRoutes)
  .use(testRoutes)

