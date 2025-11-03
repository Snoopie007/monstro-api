import type { EmailTemplates } from "@/emails";
import { emailQueue } from "@/libs/queues";
import type { Elysia } from "elysia";

type SendEmailBody = {
    recipient: string;
    template: keyof typeof EmailTemplates;
    subject: string;
    data: Record<string, string | number | boolean | object | null | undefined>;
}

export async function locationEmail(app: Elysia) {
    return app
        .post('/email', async ({ body }) => {
            const { recipient, subject, template, data } = body as SendEmailBody
            
            try {
                // Queue the email instead of sending it directly
                await emailQueue.add('send-email', {
                    to: recipient,
                    subject: subject,
                    template: template,
                    metadata: data
                }, {
                    // Optional: configure retry and timeout settings
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000
                    }
                })
                
                return { 
                    success: true,
                    message: `Email queued successfully for ${recipient}`
                }
            } catch (error) {
                console.error('Error queuing email:', error)
                throw new Error(`Failed to queue email: ${error instanceof Error ? error.message : 'Unknown error'}`)
            }
        })

}

