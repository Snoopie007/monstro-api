import { Elysia } from 'elysia';
import { db } from '@/db/db';
import { mlReservationsRoutes } from './reservations';
import { mlPlansRoutes } from './plans';
import { mlAchievementsRoutes } from './achievements';
import { mlDocsRoutes } from './docs';
import { mlReferralsRoutes } from './referrals';
import { mlRewardsRoutes } from './rewards';

type Props = {
    memberId: string
    params: {
        mid: string
        lid: string
    },
    status: any
}

export const membersLocations = new Elysia({ prefix: '/locations' })
    .get('/', async ({ memberId, params, status }: Props) => {

        try {
            const mls = await db.query.memberLocations.findMany({
                where: (memberLocations, { eq }) => eq(memberLocations.memberId, params.mid!),
                with: {
                    location: true
                }
            })

            return status(200, mls);
        } catch (error) {
            status(500, { error: 'Internal server error' });
            return { error: 'Internal server error' }
        }
    })
    .group('/:lid', (app) => {
        return app.get('/', async ({ memberId, params, status }: Props) => {
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
                status(500, { error: 'Internal server error' });
                return { error: 'Internal server error' }
            }
        })
            .use(mlReservationsRoutes)
            .use(mlPlansRoutes)
            .use(mlAchievementsRoutes)
            .use(mlDocsRoutes)
            .use(mlRewardsRoutes)
            .use(mlReferralsRoutes)
    })
