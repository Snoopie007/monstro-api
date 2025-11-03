import { Worker } from "bullmq";
import { redisConfig } from "@/config";
import { EmailSender } from "@/libs/email";
import { MonstroData } from "@/libs/data";


const emailSender = new EmailSender();
const worker = new Worker('email', async (job) => {
    const { name, data } = job;
    console.log(`Processing [${name}] with data:`, data);

    await emailSender.send({
        options: {
            to: data.to,
            subject: data.subject,
        },
        template: data.template,
        data: {
            ...data.metadata,
            monstro: MonstroData,
        },
    });

    console.log(`✅ Job [${job.name}] completed`);
}, {
    connection: redisConfig
});

worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err);
});
