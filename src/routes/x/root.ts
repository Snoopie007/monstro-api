import { Elysia } from 'elysia';
import { AuthXMiddleware } from '@/middlewares';
import { xSupport } from './loc/support/root';
import { xInvoices } from './loc/invoices/root';
import { xClass } from './loc/class/root';
import { xEmail } from './loc/email/root';
import { xChat } from './loc/chat/root';

export const XRoutes = new Elysia()
    .use(AuthXMiddleware)
    .use(xEmail)
    .group('/loc/:lid', (app) => {
        app.use(xSupport);
        app.use(xInvoices);
        app.use(xClass);
        app.use(xChat);
        return app;
    })

