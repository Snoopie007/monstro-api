import { Queue } from "bullmq";
import { redisConfig, queueConfig } from "@/config";

export const emailQueue = new Queue('email', {
    connection: redisConfig,
    defaultJobOptions: queueConfig.defaultJobOptions
});

emailQueue.on('error', (err) => {
    console.error('Email queue error:', err);
});
