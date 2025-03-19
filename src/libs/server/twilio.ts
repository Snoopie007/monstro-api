import twilio from 'twilio';
import { interpolateMsg } from '../utils';
export class TwilioClient {
    private _client: twilio.Twilio;
    private _fromPhone: string;

    constructor() {
        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
            throw new Error("Twilio credentials must be set");
        }
        if (!process.env.TWILIO_PHONE_NUMBER) {
            throw new Error("Twilio phone number must be set");
        }
        this._client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        this._fromPhone = process.env.TWILIO_PHONE_NUMBER;
    }

    public async send(to: string, message: string, data: Record<string, any>) {

        await this._client.messages.create({
            body: interpolateMsg(message, data),
            to,
            from: this._fromPhone
        });
    }
}
