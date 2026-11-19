import { Queue } from "bullmq";
import { redisConfig, queueConfig } from "@/config";
import { BULK_RUN_QUEUE, GMB_POST_QUEUE, type BulkRunJobData, type GMBDraftJobData } from "@/subtrees/bullmq";

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




export const bulkRunQueue = new Queue<BulkRunJobData>(BULK_RUN_QUEUE, {
    connection: redisConfig,
    defaultJobOptions: {
        // A run job is never retried: a retry could charge or email a member twice.
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: { age: 60 * 60 * 24 * 7 },
    }
});

// The API only queues the first draft. Keep these options in step with the worker's gmb-posts queue.
export const gmbPostQueue = new Queue<GMBDraftJobData>(GMB_POST_QUEUE, {
    connection: redisConfig,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 60 * 1000 },
        removeOnComplete: true,
        removeOnFail: { age: 60 * 60 * 24 * 7 },
    }
});

invoiceQueue.on('error', (err) => {
    console.error('Invoice queue error:', err);
});

classQueue.on('error', (err) => {
    console.error('Class queue error:', err);
});

bulkRunQueue.on('error', (err) => {
    console.error('Bulk run queue error:', err);
});

gmbPostQueue.on('error', (err) => {
    console.error('GMB post queue error:', err);
});
