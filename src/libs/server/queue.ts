import { Queue, QueueOptions } from "bullmq";

// Create Redis connection for BullMQ
function getBullMQConnection() {
  // Check for direct Redis connection details first
  if (process.env.UPSTASH_REDIS_HOST && process.env.UPSTASH_REDIS_PASSWORD) {
    return {
      host: process.env.UPSTASH_REDIS_HOST,
      port: parseInt(process.env.UPSTASH_REDIS_PORT || "6379"),
      password: process.env.UPSTASH_REDIS_PASSWORD,
      tls: {},
    };
  }

  // Fallback: try to extract from REST URL (less reliable)
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    const url = new URL(process.env.UPSTASH_REDIS_REST_URL);
    // Extract host from REST URL - this might work for some Upstash setups
    const host = url.hostname.replace("-rest", ""); // Remove '-rest' if present

    return {
      host: host,
      port: 6379, // Standard Redis port
      password: process.env.UPSTASH_REDIS_REST_TOKEN,
      tls: {},
    };
  }

  throw new Error(
    "Redis connection not configured. Please set either:\n" +
      "1. UPSTASH_REDIS_HOST, UPSTASH_REDIS_PASSWORD, and optionally UPSTASH_REDIS_PORT\n" +
      "2. Or UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (less reliable)"
  );
}

// Queue configuration
const queueConfig: QueueOptions = {
  connection: getBullMQConnection(),
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
};

// Create the admin chat queue
export const adminChatQueue = new Queue("admin-chat", queueConfig);

// Queue for node flow processing
export const nodeFlowQueue = new Queue("node-flow", queueConfig);

export { getBullMQConnection };
