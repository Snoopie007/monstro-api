import { Elysia } from 'elysia';
import { AuthXMiddleware } from '@/middlewares';



export const ProtectedRoutes = new Elysia({ prefix: '/protected' })
    .use(AuthXMiddleware)
    .group('/locations/:lid', (app) => {

        return app;
    })

