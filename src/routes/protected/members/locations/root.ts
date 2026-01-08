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
import { memberLocations } from '@/db/schemas/locations';


const GetMemberLocationsProps = {
    params: z.object({
        mid: z.string(),
    }),
};

const GetMemberLocationProps = {
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
    }, GetMemberLocationsProps)
    .post('/', async ({ params, status, body }) => {
        const { mid } = params;
        const { lid } = body;
        try {
            const ml = await db.insert(memberLocations).values({
                memberId: mid,
                locationId: lid,
                status: "incomplete",
            }).onConflictDoNothing().returning();
            return status(200, ml);
        } catch (error) {
            console.error(error);
            status(500, { error: 'Internal server error' });
            return { error: 'Internal server error' }
        }
    }, {
        ...GetMemberLocationsProps,
        body: z.object({

            lid: z.string(),
        }),
    })
    .group('/:lid', (app) => {
        app.get('/', async ({ params, status }) => {
            const { lid, mid } = params;

            try {
                const ml = await db.query.memberLocations.findFirst({
                    where: (l, { eq, and }) => and(eq(l.locationId, lid), eq(l.memberId, mid)),
                    with: {
                        pointsHistory: true,
                        member: true,
                    }
                });

                return status(200, {
                    ...ml,
                });
            } catch (error) {
                console.error(error);
                status(500, { error: 'Internal server error' });
                return { error: 'Internal server error' }
            }
        }, GetMemberLocationProps)

        app.use(mlReservationsRoutes)
        app.use(mlPlansRoutes)
        app.use(mlAchievementsRoutes)
        app.use(mlDocsRoutes)
        app.use(mlRewardsRoutes)
        app.use(mlReferralsRoutes)
        app.use(mlSupportRoutes)
        return app;

    })
