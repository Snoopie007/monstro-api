import { Elysia, t } from 'elysia';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
import { reservations } from '@subtrees/schemas';

const ReservationsProps = {
    params: t.Object({
        mid: t.String(),
        lid: t.String(),
    }),
    query: t.Object({
        limit: t.Optional(t.String()),
    }),
};

export function mlReservationsRoutes(app: Elysia) {
    return app.get('/reservations', async ({ params, query, status }) => {
        const { mid, lid } = params;
        const { limit } = query;
        const startDate = new Date();
        try {
            // Get the closest reservation to today (could be past or future)
            const classes = await db.query.reservations.findMany({
                where: (reservations, { eq, and, gte }) => and(
                    eq(reservations.memberId, mid),
                    eq(reservations.locationId, lid),
                    gte(reservations.startOn, startDate)
                ),
                limit: limit ? parseInt(limit) : 4,
                with: {
                    attendance: true,
                    session: {
                        columns: {
                            duration: true,
                        },
                        with: {
                            program: true,
                        }
                    }
                },
                orderBy: (reservations, { asc }) => asc(reservations.startOn),

            });



            // Find the closest reservation to current time
            // const closest = classes.reduce((prev, current) => {
            //     const prevDiff = Math.abs(prev.startOn.getTime() - startDate.getTime());
            //     const currentDiff = Math.abs(current.startOn.getTime() - startDate.getTime());
            //     return currentDiff < prevDiff ? current : prev;
            // });
            return status(200, classes);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Internal server error" });
        }
    }, ReservationsProps)
}
