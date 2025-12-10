import { AuthMiddleware } from '@/middlewares';
import { Elysia } from 'elysia';
import { userChats } from './chats';
import { commentRoutes } from './comments';
import { reactionRoutes } from './reactions';
import { userFeedsRoutes } from './feeds';
import { userFriends } from './friends';
import { mediaRoutes } from './medias';
import { stripeRoutes } from './stripe';
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
    memberGroups,
    memberPayments,
    memberPlans,
    memberProfile,
    membersLocations,
    resetPassword,
} from './members';

export const ProtectedRoutes = new Elysia({ prefix: '/protected' })
    .use(AuthMiddleware)
    .use(stripeRoutes)
    .use(commentRoutes)
    .use(reactionRoutes)
    .use(userChats)
    .use(userFriends)
    .use(mediaRoutes)
    .use(userFeedsRoutes)
    .group('/member/:mid', (app) => {
        app.use(membersLocations);
        app.use(memberAccounts);
        app.use(resetPassword);
        app.use(memberFamilies);
        app.use(memberPayments);
        app.use(memberGroups);
        app.use(memberPlans);
        app.group('/profile', (app) => {
            app.use(memberProfile);
            app.use(memberAvatar);
            return app;
        })
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