import { Queue } from "bullmq";
import { queueConfig, redisConfig } from "@/config";

export const assistantMemoryWritebackQueue = new Queue("assistant-memory-writeback", {
  connection: redisConfig,
  defaultJobOptions: queueConfig.defaultJobOptions,
});

assistantMemoryWritebackQueue.on("error", (error) => {
  console.error("Assistant memory queue error:", error);
});
