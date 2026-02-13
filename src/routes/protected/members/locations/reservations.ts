import { Elysia } from 'elysia';
import { db } from '@/db/db';
import { addDays } from 'date-fns';
import { z } from 'zod';

const ReservationsProps = {
    params: z.object({
        mid: z.string(),
        lid: z.string(),
    }),
};

export function mlReservationsRoutes(app: Elysia) {
    return app.get('/reservations', async ({ params, query, status }) => {
        const { mid, lid } = params;

        const limit = parseInt(query.limit || "5");


        const startDate = new Date();
        const endDate = addDays(startDate, 6);
        try {

            const reservations = await db.query.reservations.findMany({
                where: (reservations, { eq, and, gte, lte }) => and(
                    eq(reservations.memberId, mid),
                    eq(reservations.locationId, lid),
                    gte(reservations.startOn, startDate)
                ),
                limit,
                with: {
                    attendance: true,
                    session: {
                        with: {
                            program: true,
                        }
                    }
                }
            });


            return status(200, reservations);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Internal server error" });
        }
    }, {
        ...ReservationsProps,
        query: z.object({
            limit: z.string(),
        }),
    }).get('/reservations/next', async ({ params, status }) => {
        const { mid, lid } = params;

        const startDate = new Date();
        const endDate = addDays(startDate, 14);
        try {
            // Get the closest reservation to today (could be past or future)
            const reservations = await db.query.reservations.findMany({
                where: (reservations, { eq, and, gte }) => and(
                    eq(reservations.memberId, mid),
                    eq(reservations.locationId, lid),
                    gte(reservations.startOn, startDate)
                ),
                limit: 6,
                with: {
                    attendance: true,
                    session: {
                        with: {
                            program: true,
                        }
                    }
                }
            });



            if (reservations.length === 0) {
                console.log("no reservations found");
                return status(200, JSON.stringify(null));
            }

            // Find the closest reservation to current time
            const closest = reservations.reduce((prev, current) => {
                const prevDiff = Math.abs(prev.startOn.getTime() - startDate.getTime());
                const currentDiff = Math.abs(current.startOn.getTime() - startDate.getTime());
                return currentDiff < prevDiff ? current : prev;
            });
            return status(200, closest);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Internal server error" });
        }
    }, ReservationsProps)
}
