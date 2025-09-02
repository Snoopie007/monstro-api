import { Worker, Job } from "bullmq";
import { getBullMQConnection } from "../queue";
import { processAdminChat, AdminChatData } from "../ai/node-processor";

// Define the job data structure for admin chat processing
export interface AdminChatJobData {
  locationId: string;
  botId: string;
  sessionId: string;
  message: string;
  contactId?: string;
  timestamp: Date;
}

// Node flow processing function using the real engine
async function processAdminChatMessage(job: Job<AdminChatJobData>) {
  const { locationId, botId, sessionId, message, contactId } = job.data;

  try {
    // Use the real node flow processing engine
    const adminChatData: AdminChatData = {
      locationId,
      botId,
      sessionId,
      message,
      contactId,
      isTestSession: true,
    };

    const response = await processAdminChat(adminChatData);
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
