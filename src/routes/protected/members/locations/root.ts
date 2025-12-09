import { Elysia } from 'elysia';
import { db } from '@/db/db';
import { mlReservationsRoutes } from './reservations';
import { mlPlansRoutes } from './plans';
import { mlAchievementsRoutes } from './achievements';
import { mlDocsRoutes } from './docs';
import { mlReferralsRoutes } from './referrals';
import { mlRewardsRoutes } from './rewards';
import { mlSupportRoutes } from './support';
import { z } from "zod";


const MemberLocationsRootProps = {
    params: z.object({
        mid: z.string(),
    }),
};

const MemberLocationRootProps = {
    params: z.object({
        mid: z.string(),
        lid: z.string(),
    })
};

export const membersLocations = new Elysia({ prefix: '/locations' })
    .get('/', async ({ params, status }) => {

        const { mid } = params;

        try {
            const mls = await db.query.memberLocations.findMany({
                where: (memberLocations, { eq }) => eq(memberLocations.memberId, mid),
                with: {
                    location: true
                }
            })
            return status(200, mls);
        } catch (error) {
            status(500, { error: 'Internal server error' });
            return { error: 'Internal server error' }
        }
    }, MemberLocationsRootProps)
    .group('/:lid', (app) => {
        app.get('/', async ({ params, status }) => {
            const { lid, mid } = params;

            try {
                const ml = await db.query.memberLocations.findFirst({
                    where: (l, { eq, and }) => and(eq(l.locationId, lid), eq(l.memberId, mid)),
                    with: {
                        pointsHistory: true,
                        location: true,
                        member: {
                            with: {
                                user: true,
                                packages: {
                                    with: {
                                        plan: true,
                                    }
                                },
                                subscriptions: {
                                    with: {
                                        plan: true,
                                    }
                                }
                            }
                        }
                    }
                });
                return status(200, ml);
            } catch (error) {
                console.error(error);
                status(500, { error: 'Internal server error' });
                return { error: 'Internal server error' }
            }
        }, MemberLocationRootProps)
        app.use(mlReservationsRoutes)
        app.use(mlPlansRoutes)
        app.use(mlAchievementsRoutes)
        app.use(mlDocsRoutes)
        app.use(mlRewardsRoutes)
        app.use(mlReferralsRoutes)
        app.use(mlSupportRoutes)
        return app;

    })
