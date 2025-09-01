import { createAdminChatWorker } from "./admin-chat-worker";

// Start all workers
export function startWorkers() {
  console.log("🚀 Starting BullMQ workers...");

  // Start admin chat worker
  const adminChatWorker = createAdminChatWorker();

  console.log("✅ Admin chat worker started");

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}, shutting down workers gracefully...`);

    try {
      await adminChatWorker.close();
      console.log("✅ Workers shut down successfully");
      process.exit(0);
    } catch (error) {
      console.error("❌ Error during worker shutdown:", error);
      process.exit(1);
    }
  };

  // Listen for shutdown signals
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  return {
    adminChatWorker,
  };
}

// Start workers if this file is run directly
if (require.main === module) {
  startWorkers();
}
