import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import "./src/libs/worker"; // Import worker to start processing
import { serverConfig } from "./src/config";
import { RateLimitMiddleware } from "./src/middlewares";
import { AuthRoutes, ProtectedRoutes, PublicRoutes } from "./src/routes";
import { realtimeRoutes, realtimeHealthRoutes } from "./src/routes/realtime";

const CORS_CONFIG = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Admin-Key"],
};

const app = new Elysia();

app
  .use(cors(CORS_CONFIG))
  .use(RateLimitMiddleware())

  .onRequest(({ request }) => {
    console.log(`🔍 ${request.method} ${request.url}`);
  })
  // Health check endpoint for Fly.io - more robust
  .get("/", () => {
    try {
      return {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.BUN_ENV || "development",
      };
    } catch (error) {
      console.error("Health check error:", error);
      return { status: "error", message: "Health check failed" };
    }
  })
  // Dedicated health check endpoint
  .get("/healthcheck", () => {
    try {
      return {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.BUN_ENV || "development",
        service: "monstro-api",
      };
    } catch (error) {
      console.error("Health check error:", error);
      return { status: "error", message: "Health check failed" };
    }
  })
  .get("/favicon.ico", ({ set }) => {
    set.status = 204;
    return "";
  })
  .group("/api", (app) => app.use(AuthRoutes).use(ProtectedRoutes))
  .group("/api/realtime", (app) =>
    app.use(realtimeRoutes).use(realtimeHealthRoutes)
  )
  .use(PublicRoutes)
  .onError(({ code, error, set }) => {
    console.error(`❌ Error ${code}:`, error);

    if (code === "VALIDATION") {
      set.status = 400;
      return { error: "Validation failed", details: error.message };
    }

    if (code === "NOT_FOUND") {
      set.status = 404;
      return { error: "Route not found" };
    }

    set.status = 500;
    return { error: "Internal server error" };
  })
  .listen(serverConfig.port);

console.log(`🚀 Bun server running on http://localhost:${serverConfig.port}`);
