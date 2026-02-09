import { Worker } from "bullmq";
import { redisConfig } from "@/config";
import { EmailSender } from "@/libs/email";
import { invoiceWorker } from "./invoices";
import { classWorker } from "./classes";
import { subscriptionWorker } from "./subs";
console.log('Worker started');
const emailSender = new EmailSender();
const worker = new Worker('email', async (job) => {
    const { name, data } = job;

    const templateData = {
        ...data.metadata,
    };

    try {
        console.log(`📧 Sending email to ${data.to}...`);
        await emailSender.sendWithTemplate({
            options: {
                to: data.to,
                subject: data.subject,
            },
            template: data.template,
            data: templateData,
        });

        console.log(`✅ Job [${job.id}] completed successfully`);
    } catch (error) {
        console.error(`❌ Error sending email in job [${job.id}]:`, error);
        console.error(`❌ Template data was:`, JSON.stringify(templateData, null, 2));
        throw error; // Re-throw to mark job as failed
    }
}, {
    connection: redisConfig
});

subscriptionWorker.on('failed', (job, err) => {
    console.error(`❌ Subscription job ${job?.id} failed:`, err);
});
worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err);
});

invoiceWorker.on('failed', (job, err) => {
    console.error(`❌ Invoice job ${job?.id} failed:`, err);
});

classWorker.on('failed', (job, err) => {
    console.error(`❌ Class reminder job ${job?.id} failed:`, err);
});