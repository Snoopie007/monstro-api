import { Elysia } from 'elysia';
import { AuthXMiddleware } from '@/middlewares';
import { xSupport } from './loc/support/root';



export const XRoutes = new Elysia()
    .use(AuthXMiddleware)
    .group('/loc/:lid', (app) => {
        app.use(xSupport);
        return app;
    })

