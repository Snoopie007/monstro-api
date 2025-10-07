import { Elysia } from 'elysia';
import { AuthMiddleware } from '@/middlewares';
import {
    membersLocations,
    memberAccounts,
    resetPassword,
    memberFamilies,
    memberPayments,
    memberProfile,
    memberAvatar,
    memberPlans
} from './members';
import {
    locationAchievements,
    locationCheckin,
    locationDocs,
    locationReservations,
    locationLeaderboard,
    locationRewards,
    locationSessions,
    locationSupport
} from './locations';

export const ProtectedRoutes = new Elysia({ prefix: '/protected' })
    .use(AuthMiddleware)
    .group('/member/:mid', (app) => {
        app.use(membersLocations);
        app.use(memberAccounts);
        app.use(resetPassword);
        app.use(memberFamilies);
        app.use(memberPayments);
        app.use(memberProfile);
        app.use(memberAvatar);
        app.use(memberPlans);
        return app;
    })
    .group('/locations/:lid', (app) => {
        app.use(locationAchievements);
        app.use(locationCheckin);
        app.use(locationDocs);
        app.use(locationReservations);
        app.use(locationRewards);
        app.use(locationSessions);
        app.use(locationSupport);
        app.use(locationLeaderboard);
        return app;
    })
