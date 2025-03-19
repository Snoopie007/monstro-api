import * as sendgrid from '@sendgrid/mail';
import { interpolateMsg } from '../utils';




export class EmailSender {
    private _sender: sendgrid.MailService;
    private _fromEmail: string;
    constructor() {
        if (!process.env.SENDGRID_API_KEY) {
            throw new Error("SENDGRID_API_KEY must be set in the environment");
        }
        this._sender = sendgrid
        this._sender.setApiKey(process.env.SENDGRID_API_KEY);
        this._fromEmail = 'no-reply@mymonstro.com';
    }




    public async send(email: string, subject: string, template: string, data: Record<string, any>) {
        const html = interpolateMsg(template, data);

        await this._sender.send({
            to: email,
            from: this._fromEmail,
            subject: subject,
            html
        });
    }
}

