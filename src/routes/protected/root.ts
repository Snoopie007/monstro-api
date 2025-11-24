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
    memberPlans,
    memberFriends,
    memberGroups,
    memberChats,
    sendRoutes
} from './members';
import {
    locationAchievements,
    locationCheckin,
    locationDocs,
    locationReservations,
    locationLeaderboard,
    locationRewards,
    locationSessions,
    locationSupport,
    locationEmail
} from './locations';
import { commentRoutes } from './comments';
import { groupPostsRoutes } from './posts';

export const ProtectedRoutes = new Elysia({ prefix: '/protected' })
    .use(AuthMiddleware)
    .use(sendRoutes)
    .use(commentRoutes)
    .group('/member/:mid', (app) => {
        app.use(membersLocations);
        app.use(memberAccounts);
        app.use(resetPassword);
        app.use(memberFamilies);
        app.use(memberPayments);
        app.use(memberProfile);
        app.use(memberAvatar);
        app.use(memberFriends);
        app.use(memberGroups);
        app.use(memberPlans);
        app.use(memberChats);
        return app;
    })
    .group('/locations', (app) => {
        app.use(locationEmail);
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
    .use(commentRoutes)