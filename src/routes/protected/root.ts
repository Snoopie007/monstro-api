import { AuthMiddleware } from '@/middlewares';
import { Elysia } from 'elysia';
import { userChats } from './chats';
import { commentRoutes } from './comments';
import {
    locationAchievements,
    locationCheckin,
    locationDocs,
    locationEmail,
    locationLeaderboard,
    locationReservations,
    locationRewards,
    locationSessions,
    locationSupport
} from './locations';
import {
    memberAccounts,
    memberAvatar,
    memberFamilies,
    memberFriends,
    memberGroups,
    memberPayments,
    memberPlans,
    memberProfile,
    membersLocations,
    resetPassword,
} from './members';

export const ProtectedRoutes = new Elysia({ prefix: '/protected' })
    .use(AuthMiddleware)
    .use(commentRoutes)
    .use(userChats)
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