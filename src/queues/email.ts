import { redisConfig, queueConfig } from "@/config";
import { Queue } from "bullmq";
import { EmailTemplates } from "@subtrees/emails";

export const emailQueue = new Queue('email', {
    connection: redisConfig,
    defaultJobOptions: queueConfig.defaultJobOptions
});


emailQueue.on('error', (err) => {
    console.error('Email queue error:', err);
});

