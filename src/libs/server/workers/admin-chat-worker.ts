import { Worker, Job } from "bullmq";
import { getBullMQConnection } from "../queue";

// Define the job data structure for admin chat processing
export interface AdminChatJobData {
  locationId: string;
  botId: string;
  sessionId: string;
  message: string;
  contactId?: string;
  timestamp: Date;
}

// Basic processing function - will be enhanced in Phase 2
async function processAdminChatMessage(job: Job<AdminChatJobData>) {
  const { locationId, botId, sessionId, message, contactId } = job.data;

  try {
    // TODO: Phase 2 - Implement actual node flow processing
    // For now, return a placeholder response
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate processing

    const response = {
      content: `Echo: ${message} (Processed by bot ${botId})`,
      role: "ai" as const,
      metadata: {
        botId,
        sessionId,
        timestamp: new Date(),
        processed: true,
      },
    };

    return response;
  } catch (error) {
    console.error(
      `❌ Failed to process admin chat for session ${sessionId}:`,
      error
    );
    throw error;
  }
}

// Create and configure the worker
export function createAdminChatWorker() {
  const worker = new Worker<AdminChatJobData>(
    "admin-chat",
    processAdminChatMessage,
    {
      connection: getBullMQConnection(),
      concurrency: 5,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    }
  );

  // Event handlers - only log errors and failures
  worker.on("failed", (job, err) => {
    console.error(`❌ Admin chat job ${job?.id} failed:`, err);
  });

  worker.on("error", (err) => {
    console.error("❌ Admin chat worker error:", err);
  });

  return worker;
}

// Export the processing function for direct use if needed
export { processAdminChatMessage };
