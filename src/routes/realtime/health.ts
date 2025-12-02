import { Elysia } from "elysia";

export function realtimeHealthRoutes(app: Elysia) {
	return app.get("/health", async ({ status }) => {
		try {
			return status(200, {
				status: "healthy",
				timestamp: new Date().toISOString(),
				components: {
					supabaseRealtime: {
						status: "healthy",
						message: "Using Supabase Realtime broadcast for support chat",
					},
				},
				uptime: process.uptime(),
			});
		} catch (error) {
			console.error("❌ Realtime health check error:", error);
			return status(503, {
				status: "unhealthy",
				message: "Health check failed",
				error: error instanceof Error ? error.message : "Unknown error",
				timestamp: new Date().toISOString(),
			});
		}
	}).get("/stats", ({ status }) => {
		try {
			return status(200, {
				message: "Support chat now uses Supabase Realtime broadcast instead of custom WebSocket",
				timestamp: new Date().toISOString(),
				uptime: process.uptime(),
			});
		} catch (error) {
			console.error("❌ Realtime stats error:", error);
			return status(500, {
				error: "Failed to get realtime stats",
				details: error instanceof Error ? error.message : "Unknown error",
			});
		}
	});
}
