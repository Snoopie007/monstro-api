import { redisConfig } from "@/config";
import { Worker } from "bullmq";
import { checkInvoiceOverdue, processOneOffInvoice, processRecurringInvoice } from "./jobs";

export const invoiceWorker = new Worker('invoices', async (job) => {
    const {name, data} = job;
    
    // Handle recurring invoices
    if (name === 'process-recurring-invoice') {
        await processRecurringInvoice({jobId: job.id, ...data});
        return;
    }

    // Handle one-off invoice reminders
    if (name === 'send-one-off-invoice-reminder') {
        await processOneOffInvoice({jobId: job.id, ...data});
        return;
    }

    // Handle invoice overdue check (event-driven)
    if (name === 'check-invoice-overdue') {
        await checkInvoiceOverdue(data);
        return;
    }

    // If we get here, unknown job type
    console.error(`❌ Unknown job type: ${name}`);
    throw new Error(`Unknown job type: ${name}`);

}, {
    connection: redisConfig
})

