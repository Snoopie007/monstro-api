import { Elysia } from "elysia";
import { mobileAppleLogin, mobileGoogleLogin, mobileLogin, mobileRefreshToken } from "./mobile";


export const AuthRoutes = new Elysia({ prefix: '/auth' })
    .group('/mobile', (app) => {
        app.use(mobileLogin)
            .use(mobileGoogleLogin)
            .use(mobileAppleLogin)
            .use(mobileRefreshToken);
        return app
    })