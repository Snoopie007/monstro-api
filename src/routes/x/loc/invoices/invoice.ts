import { invoiceQueue } from "@/workers/queues";
import type Elysia from "elysia";


export async function oneOffInvoiceRoutes(app: Elysia) {
    return app.post('/reminder', async ({ body }) => {
        const { invoiceId, sendAt } = body as {
            invoiceId: string;
            sendAt: string;
        };

        try {
            const delay = Math.max(0, new Date(sendAt).getTime() - Date.now());
            const jobId = `one-off-invoice-reminder-${invoiceId}`;

            // Add to INVOICE queue, not email queue
            await invoiceQueue.add('send-one-off-invoice-reminder', {
                invoiceId,
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
                message: `Invoice reminder scheduled for ${sendAt}`,
                jobId
            };
        } catch (error) {
            console.error('Error scheduling invoice reminder:', error);
            throw new Error(`Failed to schedule: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    })
        .delete('/reminder/:invoiceId', async ({ params }) => {
            const { invoiceId } = params;
            const jobId = `one-off-invoice-reminder-${invoiceId}`;

            try {
                const job = await invoiceQueue.getJob(jobId);
                if (!job) {
                    return { success: false, message: 'Job not found' };
                }
                await job.remove();
                return { success: true, message: 'Reminder cancelled' };
            } catch (error) {
                throw new Error('Failed to cancel reminder');
            }
        });
}