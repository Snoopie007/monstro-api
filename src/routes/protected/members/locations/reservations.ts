import { Elysia, t } from 'elysia';
import { db } from '@/db/db';

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
    app.get('/reservations', async ({ params, query, status }) => {
        const { mid, lid } = params;
        const { limit } = query;
        const today = new Date();
        try {


            // Get the closest reservation to today (could be past or future)
            const reservations = await db.query.reservations.findMany({
                where: (r, { eq, and, gte }) => and(
                    eq(r.memberId, mid),
                    eq(r.locationId, lid),
                    gte(r.startOn, today)
                ),
                with: {
                    attendance: {
                        columns: {
                            id: true,
                            checkedInAt: true,
                        },
                    }
                },
                orderBy: (reservations, { asc }) => asc(reservations.startOn),
            });
            return status(200, reservations);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Internal server error" });
        }
    }, ReservationsProps)

    return app;
}
