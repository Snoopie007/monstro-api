import { serviceApiClient } from '../api/server';

/**
 * Server-side function to send emails via monstro-api
 * Call this from server routes/actions in monstro-15 to send templated emails
 * 
 * @example
 * await sendEmailViaApi({
 *   recipient: 'user@example.com',
 *   template: 'LoginTokenEmail',
 *   subject: 'Verify your email',
 *   data: {
 *     user: { name: 'John', email: 'john@example.com' },
 *     otp: { token: '123456' }
 *   }
 * })
 */
export async function sendEmailViaApi(params: {
    recipient: string;
    template: string;
    subject: string;
    data: Record<string, string | number | boolean | object | null | undefined>;
}): Promise<{ success: boolean; message: string }> {
    try {
        const client = serviceApiClient();
        // Use immediate send endpoint for all email sends (OTPs, payments, invites)
        return await client.post('/x/email/send', params) as { success: boolean; message: string };
    } catch (error) {
        console.error('Failed to send email via API:', error);
        throw error;
    }
}