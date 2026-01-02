import { db } from "@/db/db";
import type { ExtendedProgramSession } from "@/types/program";
import { addDays, addMinutes } from "date-fns";
import Elysia from "elysia";
import { generateVRs } from "@/libs/utils";
import { z } from "zod";


const LocationSessionsProps = {
    query: z.object({
        planId: z.string(),
        date: z.string(),
    }),
};
export async function locationSessions(app: Elysia) {
    return app.get('/sessions', async ({ params, status, query }) => {
        const { planId, date } = query;

        if (!date) {
            return status(400, { error: "Invalid request" });
        }

        const startDate = new Date(date);
        const endDate = addDays(startDate, 6);

        try {

            const planPrograms = await db.query.planPrograms.findMany({
                where: (planPrograms, { eq }) => eq(planPrograms.planId, planId!),
                with: {
                    program: {
                        with: {
                            sessions: true,
                        },
                    },
                },
            });

            const sessionIds = planPrograms.flatMap((pp) => pp.program.sessions.map((s) => s.id));

            const reservations = await db.query.reservations.findMany({
                where: (reservations, { and, between, inArray }) => and(
                    inArray(reservations.sessionId, sessionIds),
                    between(reservations.startOn, startDate, endDate)
                ),
            });

            const rrs = await db.query.recurringReservations.findMany({
                where: (rr, { and, gte, or, isNull, lte, inArray }) => and(
                    inArray(rr.sessionId, sessionIds),
                    lte(rr.startDate, startDate),
                    or(
                        isNull(rr.canceledOn),
                        gte(rr.canceledOn, startDate.toISOString().split("T")[0]!)
                    )
                ),
                with: {
                    exceptions: true,
                    session: true,
                },
            });

            const virtualReservations = generateVRs({ reservations, rrs, startDate, endDate });
            const all = [...reservations, ...virtualReservations];

            const sessions: ExtendedProgramSession[] = [];

            planPrograms.forEach((pp) => {
                pp.program.sessions.forEach((session) => {
                    const sessionTime = new Date();
                    const [hours, minutes] = session.time.split(":").map(Number);
                    sessionTime.setHours(hours!, minutes!, 0, 0);

                    sessions.push({
                        ...session,
                        reservations: all.filter((r) => r.sessionId === session.id),
                        program: pp.program,
                        startTime: sessionTime,
                        endTime: addMinutes(sessionTime, session.duration),
                    } as ExtendedProgramSession);
                });
            });


            return status(200, sessions);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Internal server error" });
        }
    }, LocationSessionsProps)
}
