import { Elysia } from 'elysia';
import { AuthXMiddleware } from '@/middlewares';
import { xSupport } from './loc/support/root';
import { xInvoices } from './loc/invoices/root';
import { xClass } from './loc/class/root';
import { xEmail } from './loc/email/root';
import { xChat } from './loc/chat/root';
import { xGroups } from './loc/groups/root';
import { locMembers } from './loc/locMembers';

export const XRoutes = new Elysia()
    .use(AuthXMiddleware)
    .use(xEmail)
    .group('/loc/:lid', (app) => {
        app.use(xSupport);
        app.use(xInvoices);
        app.use(xClass);
        app.use(xChat);
        app.use(xGroups);
        app.group('/members', (app) => app.use(locMembers));
        return app;
    })

