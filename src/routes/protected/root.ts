import { Elysia } from 'elysia';
import { AuthMiddleware } from '@/middlewares';
import {
    membersLocationsRoutes,
    memberAccounts,
    resetPassword,
    memberFamilies,
    memberPayments,
    memberProfile,
    memberAvatar
} from './members';

export const ProtectedRoutes = new Elysia({ prefix: '/protected' })
    .use(AuthMiddleware)
    .group('/member/:mid', (app) => {
        app.use(membersLocationsRoutes);
        app.use(memberAccounts);
        app.use(resetPassword);
        app.use(memberFamilies);
        app.use(memberPayments);
        app.use(memberProfile);
        app.use(memberAvatar);
        return app;
    })
