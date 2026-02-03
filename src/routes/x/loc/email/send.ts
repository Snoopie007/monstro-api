import type { Elysia } from "elysia";
import { EmailSender } from "@/libs/email";
import { EmailTemplates } from "@/emails";
import { z } from "zod";

const SendEmailBody = z.object({
    recipient: z.string(),
    template: z.string(),
    subject: z.string(),
    data: z.record(z.string(), z.any()),
})
const emailSender = new EmailSender();
export async function xEmailSend(app: Elysia) {


    return app.post('/send', async ({ body, set, status }) => {
        const { recipient, subject, template, data } = body;


        if (!Object.keys(EmailTemplates).includes(template)) {
            return status(400, { error: "Invalid template" });
        }
        try {

            await emailSender.send({
                options: {
                    to: recipient,
                    subject,
                },
                template: template as keyof typeof EmailTemplates,
                data
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
    }, { body: SendEmailBody });
}

