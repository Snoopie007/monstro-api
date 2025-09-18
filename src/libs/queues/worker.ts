import { Worker } from "bullmq";
import { redisConfig } from "./config";

// Create a worker to process jobs
const worker = new Worker('workflow', async (job) => {
    console.log(`Processing [${job.name}] with data:`, job.data);

    // simulate job execution
    await new Promise((r) => setTimeout(r, 1000));

    console.log(`✅ Job [${job.name}] completed`);
}, {
    connection: redisConfig
});

worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err);
});
