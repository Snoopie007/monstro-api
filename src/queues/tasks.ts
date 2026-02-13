import { Queue } from "bullmq";
import { redisConfig, queueConfig } from "@/config";

export const testQueue = new Queue('test', {
    connection: redisConfig,
    defaultJobOptions: queueConfig.defaultJobOptions
});




export const invoiceQueue = new Queue('invoices', {
    connection: redisConfig,
    defaultJobOptions: {
        ...queueConfig.defaultJobOptions,
        removeOnComplete: {
            age: 60 * 60 * 24 * 30, // Keep completed jobs for 30 days
            count: 100
        }
    }
})

export const classQueue = new Queue('classes', {
    connection: redisConfig,
    defaultJobOptions: {
        ...queueConfig.defaultJobOptions,
        removeOnComplete: {
            age: 60 * 60 * 24 * 7, // Keep completed jobs for 7 days
            count: 100
        }
    }
});




invoiceQueue.on('error', (err) => {
    console.error('Invoice queue error:', err);
});

classQueue.on('error', (err) => {
    console.error('Class queue error:', err);
});
