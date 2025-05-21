import * as sendgrid from '@sendgrid/mail';
import { interEmailsAndText } from '../utils';


type SupportEmailOptions = {
    options: {
        to: string;
        subject: string;
    },
    template: string;
    data: Record<string, any>;
}


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



    public async sendSupportEmail(props: SupportEmailOptions) {
        const html = interEmailsAndText(props.template, props.data);

        await this._sender.send({
            ...props.options,
            from: {
                email: 'support@mymonstro.com',
                name: 'Monstro Support'
            },
            replyTo: `case+${props.data.case.id}@mymonstro.com`,
            html
        });
    }


    public async send(email: string, subject: string, template: string, data: Record<string, any>) {
        const html = interEmailsAndText(template, data);

        await this._sender.send({
            to: email,
            from: this._fromEmail,
            subject: subject,
            html
        });
    }
}

