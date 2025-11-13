import { Queue } from "bullmq";
import { redisConfig, queueConfig } from "@/config";

export const emailQueue = new Queue('email', {
    connection: redisConfig,
    defaultJobOptions: queueConfig.defaultJobOptions
});

export const invoiceQueue = new Queue('invoice', {
    connection: redisConfig,
    defaultJobOptions: {
        ...queueConfig.defaultJobOptions,
        removeOnComplete: {
            age: 60 * 60 * 24 * 30, // Keep completed jobs for 30 days
            count: 100
        }
    }
})

emailQueue.on('error', (err) => {
    console.error('Email queue error:', err);
});

invoiceQueue.on('error', (err) => {
    console.error('Invoice queue error:', err);
});
