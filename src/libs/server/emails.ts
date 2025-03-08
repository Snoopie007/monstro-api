import * as sendgrid from '@sendgrid/mail';




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


    /**
     * Replaces placeholders in the given template string with corresponding values from the data object.
     *
     * @param template - The template string containing placeholders in the form of {{key}}.
     * @param data - An object containing key-value pairs, where keys match placeholders in the template.
     * @returns A string with placeholders replaced by their corresponding values from the data object.
     *          If a placeholder's key is not found in the data, the placeholder remains unchanged.
     */

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

        await this._sender.send({
            to: email,
            from: this._fromEmail,
            subject: subject,
            html
        });
    }
}

