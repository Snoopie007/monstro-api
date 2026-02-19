import { AuthMiddleware } from '@/middlewares';
import { Elysia } from 'elysia';
import { commentRoutes } from './comments';
import { reactionRoutes } from './reactions';
import {
    userFeedsRoutes,
    userMomentsRoutes,
    userChatsRoutes,
    userSupportRoutes,
    userNotificationRoutes,
} from './users';
import { friendsRoutes } from './friends';
import { mediaRoutes } from './medias';
import { stripeRoutes } from './stripe';
import { groupRoutes } from './groups';
import { locationsRoutes } from './locations';
import { userAccountsRoutes } from './users/accounts';
import { searchRoutes } from './search';
import { familyRoutes } from './family';
import {
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
    .use(friendsRoutes)
    .use(searchRoutes)
    .use(mediaRoutes)
    .use(groupRoutes)
    .group('/users/:uid', (app) => {
        app.use(userSupportRoutes);
        app.use(userAccountsRoutes);
        app.use(userFeedsRoutes);
        app.use(userMomentsRoutes);
        app.use(userChatsRoutes);
        app.use(userNotificationRoutes);
        return app;
    })
    .group('/member/:mid', (app) => {
        app.use(membersLocations);
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
    .use(locationsRoutes)
    .use(commentRoutes)
    .use(familyRoutes)