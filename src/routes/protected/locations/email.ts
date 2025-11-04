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
                    }
                };
                
                // Add scheduling options if this is a future email
                if (delay !== undefined && delay > 0) {
                    queueOptions.delay = delay;
                    queueOptions.removeOnComplete = {
                        age: 60 * 60 * 24 * 7, // Keep for 7 days after sending
                        count: 100
                    };
                }
                
                // Add jobId if provided (prevents duplicate scheduled emails)
                if (jobId) {
                    queueOptions.jobId = jobId;
                }
                
                // Queue the email
                await emailQueue.add('send-email', {
                    to: recipient,
                    subject: subject,
                    template: template,
                    metadata: data
                }, queueOptions);
                
                return { 
                    success: true,
                    message: sendAt 
                        ? `Email scheduled for ${recipient} at ${sendAt}`
                        : `Email queued successfully for ${recipient}`
                }
            } catch (error) {
                console.error('Error queuing email:', error)
                throw new Error(`Failed to queue email: ${error instanceof Error ? error.message : 'Unknown error'}`)
            }
        })

}

