import { invoiceQueue } from "@/workers/queues/tasks";
import type Elysia from "elysia";
import { z } from "zod";

const ScheduleOverdueCheckProps = {
    body: z.object({
        invoiceId: z.string(),
        sendAt: z.string(),
    }),
};

const CancelOverdueCheckProps = {
    params: z.object({
        invoiceId: z.string(),
    }),
};
export async function overdueInvoiceRoutes(app: Elysia) {
    return app.post('/overdue', async ({ body }) => {
        const { invoiceId, sendAt } = body;

        try {
            const delay = Math.max(0, new Date(sendAt).getTime() - Date.now());
            const jobId = `overdue-check-${invoiceId}`;

            await invoiceQueue.add('check-invoice-overdue', {
                invoiceId,
                reminderCount: 0, // Start at 0
            }, {
                jobId,
                delay,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000
                }
            });

            return {
                success: true,
                message: `Overdue check scheduled for invoice ${invoiceId}`,
                jobId
            };
        } catch (error) {
            console.error('Error scheduling overdue check:', error);
            throw new Error(`Failed to schedule: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }, ScheduleOverdueCheckProps).delete('/overdue/:invoiceId', async ({ params }) => {
        const { invoiceId } = params;

        try {
            // Remove all reminder jobs for this invoice (including numbered reminders)
            let removedCount = 0;

            // Try to remove the main job
            const mainJobId = `overdue-check-${invoiceId}`;
            const mainJob = await invoiceQueue.getJob(mainJobId);
            if (mainJob) {
                await mainJob.remove();
                removedCount++;
            }

            // Remove all numbered reminder jobs
            for (let i = 0; i < 10; i++) { // Max 10 reminders
                const reminderJobId = `overdue-check-${invoiceId}-reminder-${i}`;
                const reminderJob = await invoiceQueue.getJob(reminderJobId);
                if (reminderJob) {
                    await reminderJob.remove();
                    removedCount++;
                }
            }

            return {
                success: true,
                message: `Cancelled ${removedCount} overdue reminder(s) for invoice ${invoiceId}`,
                removedCount
            };
        } catch (error) {
            console.error('Error cancelling overdue check:', error);
            throw new Error(`Failed to cancel: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }, CancelOverdueCheckProps);
}