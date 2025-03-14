import * as sendgrid from '@sendgrid/mail';
sendgrid.setApiKey(process.env.SENDGRID_API_KEY!);


export class EmailSender {
    private _senderEmail: string;
    private _fromEmail: string;
    constructor() {
        this._senderEmail = process.env.SENDER_EMAIL!;
        this._fromEmail = 'no-reply@mymonstroapp.com';
    }

    public getSenderEmail() {
        return this._senderEmail;
    }

    private interpolate(template: string, data: Record<string, any>): string {
        return template.replace(/\{\{([^}]+)\}\}/g, (match: string, p1: string): string => {
            // Split the path into parts (e.g. "user.name" -> ["user", "name"])
            const parts = p1.trim().split('.');

            // Traverse the object following the path
            let value: any = data;
            for (const part of parts) {
                if (value === undefined || value === null) return match;
                value = value[part];
            }

            return String(value ?? match);
        });
    }

    public async send(email: string, subject: string, template: string, data: Record<string, any>) {
        const html = this.interpolate(template, data);

        await sendgrid.send({
            to: email,
            from: this._fromEmail,
            subject: subject,
            html
        });
    }
}

