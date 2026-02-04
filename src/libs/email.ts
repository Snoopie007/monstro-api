import sendgrid from '@sendgrid/mail';
import { render } from '@react-email/render';
import { renderToStaticMarkup } from 'react-dom/server';
import { EmailTemplates } from '@/emails';


type EmailOptions = {
    to: string;
    subject: string;
    headers?: Record<string, string>;
}
type SendProps = {
    template: keyof typeof EmailTemplates;
    data: Record<string, any>;
    options: EmailOptions,
}

type SendWithTemplateProps = {
    to: string;
    subject: string;
    html: string;
    options?: {
        headers?: Record<string, string>;
    }
}

export class EmailSender {
    private _sender: typeof sendgrid;
    private _fromEmail: string;

    constructor() {
        if (!process.env.SENDGRID_API_KEY) {
            throw new Error("SENDGRID_API_KEY must be set in the environment");
        }
        this._sender = sendgrid;
        this._sender.setApiKey(process.env.SENDGRID_API_KEY);
        this._fromEmail = 'no-reply@mymonstro.com';
    }

    public async sendSupportEmail(props: SendProps) {
        const TemplateComponent = EmailTemplates[props.template] as any;
        const html = await render(TemplateComponent(props.data));

        await this._sender.send({
            ...props.options,
            from: {
                email: 'support@mymonstro.com',
                name: 'Monstro Support'
            },
            replyTo: `case+${props.data.case.id}@support.mymonstro.com`,
            html
        });
    }


    public async send(props: SendProps) {
        const TemplateComponent = EmailTemplates[props.template] as any;
        const html = '<!DOCTYPE html>' + renderToStaticMarkup(TemplateComponent(props.data));

        await this._sender.send({
            ...props.options,
            from: {
                email: this._fromEmail,
                name: 'Monstro X'
            },
            html
        });
    }

    public async sendWithTemplate(props: SendWithTemplateProps) {
        const { html, to, subject, options } = props;
        const htmlRendered = '<!DOCTYPE html>' + html;
        await this._sender.send({
            ...options,
            from: {
                email: this._fromEmail,
                name: 'Monstro X'
            },
            to,
            subject,
            html: htmlRendered
        });
    }
    public async sendText(email: string, subject: string, text: string) {
        await this._sender.send({
            to: email,
            from: this._fromEmail,
            subject: subject,
            text
        });
    }
}