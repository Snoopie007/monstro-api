import { invoiceQueue } from "@/libs/queues";
import type Elysia from "elysia";

type ScheduleRecurringInvoiceBody = {
    subscriptionId: string;
    memberId: string;
    locationId: string;
}

type CancelRecurringInvoiceParams = {
    subscriptionId: string;
}

export async function recurringInvoiceRoutes(app: Elysia) {
    return app.post('/recurring', async ({ body }) => {
        const { subscriptionId, memberId, locationId } = body as ScheduleRecurringInvoiceBody;

        try { 
            const jobId = `recurring-invoice-${subscriptionId}`;

            await invoiceQueue.add('process-recurring-invoice', {
                subscriptionId,
                memberId,
                locationId,
            }, {
                jobId,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000
                }
            });

             return {
                    success: true,
                    message: `Recurring invoice reminders scheduled for subscription ${subscriptionId}`,
                    jobId
                };
        }  catch (error) {
            console.error('Error scheduling recurring invoice:', error);
            throw new Error(`Failed to schedule: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    })
    .delete('/recurring/:subscriptionId', async ({ params }: {params: CancelRecurringInvoiceParams}) => {   
        const { subscriptionId } = params;
            
            try {
                // Remove all reminder jobs for this subscription (including numbered reminders)
                let removedCount = 0;
                
                // Try to remove the main job (for pre-due reminders)
                const mainJobId = `recurring-invoice-${subscriptionId}`;
                const mainJob = await invoiceQueue.getJob(mainJobId);
                if (mainJob) {
                    await mainJob.remove();
                    removedCount++;
                }
                
                // Remove all numbered reminder jobs (overdue reminders)
                for (let i = 0; i < 10; i++) { // Max 10 reminders
                    const reminderJobId = `recurring-invoice-${subscriptionId}-reminder-${i}`;
                    const reminderJob = await invoiceQueue.getJob(reminderJobId);
                    if (reminderJob) {
                        await reminderJob.remove();
                        removedCount++;
                    }
                }

                return {
                    success: true,
                    message: `Cancelled ${removedCount} recurring invoice reminder(s) for subscription ${subscriptionId}`,
                    removedCount
                };
            } catch (error) {
                console.error('Error cancelling recurring invoice:', error);
                throw new Error(`Failed to cancel: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
    })
}