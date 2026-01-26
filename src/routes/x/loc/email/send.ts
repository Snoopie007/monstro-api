import type { Elysia } from "elysia";
import { EmailSender } from "@/libs/email";
import type { EmailTemplates } from "@/emails";
import { MonstroData } from "@/constants/data";

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
            // Automatically inject Monstro data and default location if not provided
            const enrichedData = {
                ...data,
                monstro: data.monstro || MonstroData,
                location: data.location || {
                    name: 'Monstro',
                    email: MonstroData.email
                }
            };

            await emailSender.send({
                options: {
                    to: recipient,
                    subject: subject,
                },
                template: template,
                data: enrichedData
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

