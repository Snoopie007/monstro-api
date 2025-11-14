import { redisConfig } from "@/config";
import { Worker } from "bullmq";
import { processClassReminder, processRecurringClassReminder, checkMissedClass } from "./jobs/classes";

export const classWorker = new Worker('classes', async (job) => {
    const { name, data } = job;
    
    // Handle single class reminders
    if (name === 'send-class-reminder') {
        await processClassReminder(data);
        return;
    }

    // Handle recurring class reminders (recursive pattern)
    if (name === 'process-recurring-class-reminder') {
        await processRecurringClassReminder(data);
        return;
    }

    // Handle missed class check
    if (name === 'check-missed-class') {
        await checkMissedClass(data);
        return;
    }

    // If we get here, unknown job type
    console.error(`❌ Unknown job type: ${name}`);
    throw new Error(`Unknown job type: ${name}`);

}, {
    connection: redisConfig
});

