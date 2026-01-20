import { Elysia } from "elysia";
import {
    mobileAppleLogin, mobileGoogleLogin,
    mobileLogin, mobileRefreshToken, verifySession, mobileRegister
} from "./mobile";


export const AuthRoutes = new Elysia({ prefix: '/auth' })
    .group('/mobile', (app) => {
        app.use(mobileLogin)
        app.use(mobileGoogleLogin)
        app.use(mobileRegister)
        app.use(mobileAppleLogin)
        app.use(mobileRefreshToken)
        app.use(verifySession)
        return app
    })