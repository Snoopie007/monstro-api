import { Elysia } from "elysia";
import {
    mobileAppleLogin, mobileGoogleLogin,
    mobileLogin, mobileRefreshToken,
    verifySession, mobileRegister,
    mobileResetPassword,
} from "./mobile";
import { staffLogin } from "./staff/login";


export const AuthRoutes = new Elysia({ prefix: '/auth' })
    .group('/staff', (app) => {
        app.use(staffLogin)
        return app
    })
    .group('/mobile', (app) => {
        app.use(mobileLogin)
        app.use(mobileGoogleLogin)
        app.use(mobileRegister)
        app.use(mobileAppleLogin)
        app.use(mobileRefreshToken)
        app.use(verifySession)
        app.use(mobileResetPassword)
        return app
    })