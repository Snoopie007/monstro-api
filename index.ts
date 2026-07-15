import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { serverConfig } from "./src/config";
import { RateLimitMiddleware } from "./src/middlewares";
import {
	AuthRoutes, MemberCourseRoutes, ProtectedRoutes, PublicRoutes,
	XRoutes, webhooksRoutes
} from "./src/routes";
import { realtimeRoutes, realtimeHealthRoutes } from "./src/routes/realtime";
import { startOnlineChannel } from "./src/libs/broadcast";
import { WebRoutes } from "./src/routes/web";

const CORS_CONFIG = {
	origin: "*",
	methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization", "X-Mobile", "X-Admin-Key", "x-correlation-id"],
};

export const app = new Elysia({
	serve: {
		maxRequestBodySize: 1024 * 1024 * 10, // 10MB
	}
});

app.use(cors(CORS_CONFIG))
	.onError(({ code, error, set }) => {
		console.log(`❌ Error ${code}:`);

		if (code === "VALIDATION") {
			set.status = 400;
			error.all.forEach((err: Record<string, any>) => {
				console.log(`Validation ${err.summary} on ${err.path}`);
			});
			return { error: "Validation failed", details: error.message };
		}

		if (code === "NOT_FOUND") {
			set.status = 404;
			return { error: "Route not found" };
		}

		console.error(error);
		set.status = 500;
		return { error: "Internal server error" };
	})
	.use(RateLimitMiddleware())
	.onRequest(({ request }) => {
		console.log("request.url", request.url);
		// Check if request came through HTTPS proxy
		if (request.url.includes('/healthcheck')) {
			return;
		}
		console.log(`🔥 ${request.method} ${request.url}`);
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

	.group("/api", (app) => app.use(AuthRoutes).use(MemberCourseRoutes).use(ProtectedRoutes))
	.group("/x", (app) => app.use(XRoutes))
	.group("/api/realtime", (app) =>
		app.use(realtimeRoutes).use(realtimeHealthRoutes)
	)
	.group("/web", (app) => app.use(WebRoutes))
	.use(PublicRoutes)
	.use(webhooksRoutes);

if (import.meta.main) {
	app.listen({
		hostname: "0.0.0.0",
		port: serverConfig.port,
	});
	console.log(`🚀 Bun server running on http://localhost:${serverConfig.port}`);
	startOnlineChannel();
}