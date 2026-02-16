
import { redisConfig } from "@/config";
import { Queue } from "bullmq";

export const paymentQueue = new Queue('payments', {
    connection: redisConfig,
    defaultJobOptions: {
        attempts: 8,
        removeOnFail: true,
        removeOnComplete: true,
        backoff: {
            type: 'exponential',
            delay: 24 * 60 * 60 * 1000,
        }
    }
});


paymentQueue.on('error', (err) => {
    console.error('Payment error:', err);
});