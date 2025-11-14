import { Elysia } from 'elysia';
import { AuthXMiddleware } from '@/middlewares';
import { xSupport } from './loc/support/root';
import { xInvoices } from './loc/invoices/root';
import { xClass } from './loc/class/root';

export const XRoutes = new Elysia()
    .use(AuthXMiddleware)
    .group('/loc/:lid', (app) => {
        app.use(xSupport);
        app.use(xInvoices);
        app.use(xClass);
        return app;
    })

