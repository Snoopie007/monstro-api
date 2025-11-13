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
                const jobId = `recurring-invoice-${subscriptionId}`;
                const job = await invoiceQueue.getJob(jobId);

                if (!job) {
                    return {
                        success: false,
                        message: `No recurring invoice job found for subscription ${subscriptionId}`
                    };
                }

                await job.remove();

                return {
                    success: true,
                    message: `Cancelled recurring invoice reminders for subscription ${subscriptionId}`
                };
            } catch (error) {
                console.error('Error cancelling recurring invoice:', error);
                throw new Error(`Failed to cancel: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
    })
}