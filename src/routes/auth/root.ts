import { Elysia } from "elysia";
import { mobileAppleLogin, mobileGoogleLogin, mobileLogin, mobileRefreshToken } from "./mobile";


export const AuthRoutes = new Elysia({ prefix: '/auth' })
    .group('/mobile', (app) => {
        app.use(mobileLogin)
        app.use(mobileGoogleLogin)
        app.use(mobileAppleLogin)
        app.use(mobileRefreshToken)
        return app
    })