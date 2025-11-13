import { Worker } from "bullmq";
import { redisConfig } from "@/config";
import { EmailSender } from "@/libs/email";
import { MonstroData } from "@/libs/data";
import { shouldSendMissedClassEmail } from "@/libs/emailValidation";
import { invoiceWorker } from "./invoices";


const emailSender = new EmailSender();
const worker = new Worker('email', async (job) => {
    const { name, data } = job;
    // pull
    // Check if this is a missed class email that should be validated
    if (data.template === 'MissedClassEmail') {
        const shouldSend = await shouldSendMissedClassEmail(data.metadata);
        if (!shouldSend) {
            console.log(`⏭️ Skipping missed class email - member attended or validation failed`);
            return; // Job completes successfully without sending
        }
    }

    // Merge metadata with MonstroData only if monstro is not already provided
    const templateData = {
        ...data.metadata,
        monstro: data.metadata?.monstro || MonstroData,
    };

    try {
        console.log(`📧 Sending email to ${data.to}...`);
        await emailSender.send({
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

worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err);
});

invoiceWorker.on('failed', (job, err) => {
    console.error(`❌ Recurring invoice job ${job?.id} failed:`, err);
});