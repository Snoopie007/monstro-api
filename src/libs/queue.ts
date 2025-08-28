import { Queue } from "bullmq";
import { redisConfig, queueConfig } from "../config";

export const queue = new Queue(queueConfig.name, {
    connection: redisConfig,
    defaultJobOptions: queueConfig.defaultJobOptions
});
