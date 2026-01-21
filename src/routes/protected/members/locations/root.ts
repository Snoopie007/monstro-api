import { Elysia, t } from 'elysia';
import { db } from '@/db/db';
import { mlReservationsRoutes } from './reservations';
import { mlPlansRoutes } from './plans';
import { mlAchievementsRoutes } from './achievements';
import { mlDocsRoutes } from './docs';
import { mlReferralsRoutes } from './referrals';
import { mlRewardsRoutes } from './rewards';
import { mlSupportRoutes } from './support';
import { mlPointsRoutes } from './points';
import { memberLocations } from '@/db/schemas';
import type { ExtendedLocation } from '@/types';


const GeMLProps = {
    params: t.Object({
        mid: t.String(),
    }),
};



export const membersLocations = new Elysia({ prefix: '/locations' })
    .get('/', async ({ params, status }) => {

        const { mid } = params;

        try {
            let lids: string[] = [];
            const mls = await db.query.memberLocations.findMany({
                where: (memberLocations, { eq }) => eq(memberLocations.memberId, mid),

            })

            mls.forEach(ml => {
                lids.push(ml.locationId);
            });

            const migrations = await db.query.migrateMembers.findMany({
                where: (mm, { and, eq }) => and(
                    eq(mm.memberId, mid),
                    eq(mm.status, "pending")
                ),
            });
            migrations.forEach(m => {
                lids.push(m.locationId);
            });

            const locations = await db.query.locations.findMany({
                where: (locations, { inArray }) => inArray(locations.id, lids),
                with: {
                    locationState: true,
                },
            });


            let extendedLocations: ExtendedLocation[] = [];

            locations.forEach(l => {
                const migration = migrations.find(m => m.locationId === l.id);
                const memberLocation = mls.find(ml => ml.locationId === l.id);

                extendedLocations.push({
                    migration,
                    ...l,
                    locationState: l.locationState,
                    memberLocation,
                });
            });

            return status(200, extendedLocations);
        } catch (error) {
            status(500, { error: 'Internal server error' });
            return { error: 'Internal server error' }
        }
    }, GeMLProps)
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
        ...GeMLProps,
        body: t.Object({
            lid: t.String(),
        }),
    })
    .group('/:lid', (app) => {
        app.use(mlReservationsRoutes)
        app.use(mlPlansRoutes)
        app.use(mlAchievementsRoutes)
        app.use(mlDocsRoutes)
        app.use(mlRewardsRoutes)
        app.use(mlReferralsRoutes)
        app.use(mlSupportRoutes)
        app.use(mlPointsRoutes)
        return app;

    })
