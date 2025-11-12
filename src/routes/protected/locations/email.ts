import type { EmailTemplates } from "@/emails";
import { emailQueue } from "@/libs/queues";
import type { Elysia } from "elysia";

type SendEmailBody = {
    recipient: string;
    template: keyof typeof EmailTemplates;
    subject: string;
    data: Record<string, string | number | boolean | object | null | undefined>;
    sendAt?: string; // ISO timestamp for when to send (optional)
    jobId?: string; // Unique job ID to prevent duplicates (optional)
}

export async function locationEmail(app: Elysia) {
    return app
        .post('/email', async ({ body }) => {
            const { recipient, subject, template, data, sendAt, jobId } = body as SendEmailBody

            try {
                // Calculate delay if sendAt is provided
                const delay = sendAt
                    ? Math.max(0, new Date(sendAt).getTime() - Date.now())
                    : undefined;

                // Queue options
                const queueOptions: any = {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000
                    },
                    removeOnComplete: {
                        age: 60 * 60 * 24 * 7,
                        count: 100
                    }
                };

                // Add delay if provided (including 0 for immediate sending)
                if (delay !== undefined) {
                    queueOptions.delay = delay;
                }

                if (jobId) {
                    queueOptions.jobId = jobId;
                }

                // Queue the email
                const addedJob = await emailQueue.add('send-email', {
                    to: recipient,
                    subject: subject,
                    template: template,
                    metadata: data
                }, queueOptions);

                return {
                    success: true,
                    message: sendAt
                        ? `Email scheduled for ${recipient} at ${sendAt}`
                        : `Email queued successfully for ${recipient}`,
                    jobId: addedJob.id
                }
            } catch (error) {
                console.error('Error queuing email:', error);
                throw new Error(`Failed to queue email: ${error instanceof Error ? error.message : 'Unknown error'}`)
            }
        })
        .delete('/email/:jobId', async ({ params }) => {
            const { jobId } = params;

            try {
                // Try to find and remove the job from the queue
                const job = await emailQueue.getJob(jobId);

                if (!job) {
                    return {
                        success: false,
                        message: `Job ${jobId} not found in queue`
                    };
                }

                // Remove the job
                await job.remove();

                console.log(`📧 Cancelled email job: ${jobId}`);

                return {
                    success: true,
                    message: `Email job ${jobId} cancelled successfully`
                };
            } catch (error) {
                console.error('Error cancelling email job:', error);
                throw new Error(`Failed to cancel email job: ${error instanceof Error ? error.message : 'Unknown error'}`)
            }
        })

}

