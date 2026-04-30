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
import { memberLocations } from '@subtrees/schemas';
import { paymentMethodsRoutes } from './methods/root';
import { createLocationChat } from '@/utils/chatsGroupsUtils';
import { memberLocationPassesRoutes } from './passes';

const GeMLProps = {
    params: t.Object({
        mid: t.String(),
    }),
};



export const membersLocations = new Elysia({ prefix: '/locations' })
    .get('/', async ({ params, status }) => {

        const { mid } = params;

        try {
            const mls = await db.query.memberLocations.findMany({
                where: (memberLocations, { eq }) => eq(memberLocations.memberId, mid),
                with: {
                    location: {
                        with: {
                            locationState: true,
                        },
                    },
                },
            })


            // const migrations = await db.query.migrateMembers.findMany({
            //     where: (migrateMembers, { eq, and }) => and(
            //         eq(migrateMembers.memberId, mid),
            //         eq(migrateMembers.status, "pending"),
            //     ),
            //     with: {
            //         pricing: {
            //             with: {
            //                 plan: true,
            //             },
            //         },
            //         location: {
            //             with: {
            //                 locationState: true,
            //             },
            //         },
            //     },
            // });


            return status(200, mls);
        } catch (error) {
            console.error(error);
            status(500, { error: 'Internal server error' });
            return { error: 'Internal server error' }
        }
    }, GeMLProps)
    .post('/', async ({ params, status, body }) => {
        const { mid } = params;
        const { lid } = body;
        try {

            const location = await db.query.locations.findFirst({
                where: (l, { eq }) => eq(l.id, lid),
                columns: {
                    name: true,
                    welcomeMessage: true,

                },
                with: {
                    locationState: true,
                    vendor: {
                        columns: {
                            userId: true,
                        },
                    },
                },
            });

            if (!location) {
                return status(404, { error: 'Location not found' });
            }

            const member = await db.query.members.findFirst({
                where: (m, { eq }) => eq(m.id, mid),
                columns: {
                    userId: true,
                    firstName: true,
                },
            });

            if (!member) {
                return status(404, { error: 'Member not found' });
            }

            const [newMemberLocation] = await db.insert(memberLocations).values({
                memberId: mid,
                locationId: lid,
                status: "incomplete",
            }).onConflictDoNothing().returning();


            createLocationChat(lid, member, location);
            return status(200, {
                ...newMemberLocation,
                location: location,
            });
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
        app.use(memberLocationPassesRoutes)
        app.use(mlReservationsRoutes)
        app.use(mlPlansRoutes)
        app.use(mlAchievementsRoutes)
        app.use(mlDocsRoutes)
        app.use(mlRewardsRoutes)
        app.use(mlReferralsRoutes)
        app.use(mlSupportRoutes)
        app.use(mlPointsRoutes)
        app.use(paymentMethodsRoutes)
        return app;

    })
