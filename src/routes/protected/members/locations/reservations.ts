import { Elysia } from 'elysia';
import { db } from '@/db/db';
import { addDays, isAfter } from 'date-fns';
import { generateVRs } from '@/libs/utils';
type Props = {
    memberId: string
    params: {
        mid: string
        lid: string
    },
    status: any
}
export const mlReservationsRoutes = new Elysia({ prefix: '/:lid/reservations' })
    .get('/', async ({ memberId, params, query, status }: Props & { query: { limit: string } }) => {
        const { mid, lid } = params;
        console.log(query);
        const limit = parseInt(query.limit || "5");


        const startDate = new Date();
        const endDate = addDays(startDate, 6);
        try {

            const r = await db.query.reservations.findMany({
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

            const rr = await db.query.recurringReservations.findMany({
                where: (rr, { eq, and, lte, isNull, or, gte }) => and(
                    eq(rr.memberId, mid),
                    eq(rr.locationId, lid),
                    lte(rr.startDate, startDate),
                    or(
                        isNull(rr.canceledOn),
                        gte(rr.canceledOn, startDate.toISOString().split("T")[0]!)
                    )
                ),
                limit,
                with: {
                    attendances: true,
                    exceptions: true,
                    session: {
                        with: {
                            program: true,
                        }
                    }
                }
            });

            const vrs = generateVRs({ reservations: r, rrs: rr, startDate, endDate }).slice(0, limit);

            return status(200, [...r, ...vrs]);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Internal server error" });
        }
    })
    .get('/next', async ({ memberId, params, status }: Props) => {
        const { mid, lid } = params;

        const startDate = new Date();
        const endDate = addDays(startDate, 14);
        try {
            // Get the closest reservation to today (could be past or future)
            const r = await db.query.reservations.findFirst({
                where: (reservations, { eq, and, gte }) => and(
                    eq(reservations.memberId, mid),
                    eq(reservations.locationId, lid),
                    gte(reservations.startOn, startDate)
                ),
                with: {
                    attendance: true,
                    session: {
                        with: {
                            program: true,
                        }
                    }
                }
            });



            const rr = await db.query.recurringReservations.findMany({
                where: (rr, { eq, and, lte, isNull, or, gte }) => and(
                    eq(rr.memberId, mid),
                    eq(rr.locationId, lid),
                    lte(rr.startDate, startDate),
                    or(
                        isNull(rr.canceledOn),
                        gte(rr.canceledOn, startDate.toISOString().split("T")[0]!)
                    )
                ),
                with: {
                    attendances: true,
                    exceptions: true,
                    session: {
                        with: {
                            program: true,
                        }
                    }
                }
            });


            const vrs = generateVRs({ reservations: [], rrs: rr, startDate, endDate });
            const filteredVrs = vrs.filter(vr => isAfter(vr.startOn, startDate));
            // Find the closest reservation among both r and vrs
            const all = [...(r ? [r] : []), ...filteredVrs];

            if (all.length === 0) {
                return status(200, null);
            }

            // Find the closest reservation to current time
            const closest = all.reduce((prev, current) => {
                const prevDiff = Math.abs(prev.startOn.getTime() - startDate.getTime());
                const currentDiff = Math.abs(current.startOn.getTime() - startDate.getTime());
                return currentDiff < prevDiff ? current : prev;
            });

            return status(200, closest);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Internal server error" });
        }
    })