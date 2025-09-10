import { Elysia } from "elysia";

// Import the global instances (these will be created in websocket.ts)
let connectionManager: any = null;
let databaseListener: any = null;

// Setter functions to be called from websocket.ts
export function setHealthCheckInstances(cm: any, dl: any) {
  connectionManager = cm;
  databaseListener = dl;
}

export function realtimeHealthRoutes(app: Elysia) {
  return app
    .get("/health", async ({ status }) => {
      try {
        const connectionStats = connectionManager?.getStats() || {
          totalConnections: 0,
          totalConversations: 0,
          totalMembers: 0,
        };

        const databaseStatus = (await databaseListener?.healthCheck()) || {
          status: "unknown",
          message: "Database listener not initialized",
        };

        const overallHealthy = databaseStatus.status === "healthy";

        return status(overallHealthy ? 200 : 503, {
          status: overallHealthy ? "healthy" : "unhealthy",
          timestamp: new Date().toISOString(),
          components: {
            websocket: {
              status: "healthy",
              connections: connectionStats,
            },
            database: databaseStatus,
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
    })

    .get("/stats", ({ status }) => {
      try {
        const connectionStats = connectionManager?.getStats() || {
          totalConnections: 0,
          totalConversations: 0,
          totalMembers: 0,
          conversationDetails: [],
        };

        const databaseStatus = databaseListener?.getStatus() || {
          isRunning: false,
          channelCount: 0,
          supabaseConnected: false,
        };

        return status(200, {
          connections: connectionStats,
          database: databaseStatus,
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
