import type { Elysia } from "elysia";
import { EmailSender } from "@/libs/email";
import type { EmailTemplates } from "@/emails";

type SendEmailBody = {
    recipient: string;
    template: keyof typeof EmailTemplates;
    subject: string;
    data: Record<string, string | number | boolean | object | null | undefined>;
}

export async function xEmailSend(app: Elysia) {
    const emailSender = new EmailSender();

    return app.post('/send', async ({ body, set }) => {
        const { recipient, subject, template, data } = body as SendEmailBody;

        try {
            await emailSender.send({
                options: {
                    to: recipient,
                    subject: subject,
                },
                template: template,
                data: data
            });

            console.log(`📧 Sent immediate email to ${recipient} using template ${template}`);

            return {
                success: true,
                message: `Email sent immediately to ${recipient}`
            }
        } catch (error) {
            console.error('Error sending immediate email:', error);
            set.status = 500;
            return {
                success: false,
                error: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
        }
    });
}

