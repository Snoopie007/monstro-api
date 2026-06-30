import { Queue } from "bullmq";
import { redisConfig, queueConfig } from "@/config";

export const rankQueue = new Queue("rank", {
    connection: redisConfig,
    defaultJobOptions: queueConfig.defaultJobOptions,
});

rankQueue.on("error", (err) => {
    console.error("Rank queue error:", err);
});
