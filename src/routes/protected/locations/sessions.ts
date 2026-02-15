import { db } from "@/db/db";
import type { ExtendedProgramSession } from "@subtrees/types";
import { addDays, addMinutes } from "date-fns";
import { Elysia, t } from "elysia";
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

const SessionsProps = {
    params: t.Object({
        lid: t.String(),
    }),
    query: t.Object({
        programIds: t.String(),
        date: t.String(),
    }),
};
export async function locationSessions(app: Elysia) {
    return app.get('/sessions', async ({ params, status, query }) => {
        const { lid } = params;
        const { programIds, date } = query;
        const programIdsArray = programIds.split(",");

        if (!date) {
            return status(400, { error: "Invalid request" });
        }

        const startDate = new Date(date);
        const endDate = addDays(startDate, 6);

        try {

            const location = await db.query.locations.findFirst({
                where: (locations, { eq }) => eq(locations.id, lid),
                columns: {
                    timezone: true,
                },
            });
            if (!location) {
                return status(404, { error: "Location not found" });
            }

            const programs = await db.query.programs.findMany({
                where: (programs, { inArray }) => inArray(programs.id, programIdsArray),
                with: {
                    sessions: true,
                },
            });

            const sessionIds = programs.flatMap((program) => program.sessions.map((session) => session.id));

            const reservations = await db.query.reservations.findMany({
                where: (reservations, { and, between, inArray }) => and(
                    inArray(reservations.sessionId, sessionIds),
                    between(reservations.startOn, startDate, endDate)
                ),
            });


            console.log(location.timezone);

            const sessions: ExtendedProgramSession[] = [];

            programs.forEach((program) => {
                program.sessions.forEach((session) => {
                    // session.day is expected to be 0=Sunday, 1=Monday, ..., 6=Saturday
                    // startDate is the first day of the week as per above
                    const sessionDay = typeof session.day === "number" ? session.day : 0;
                    const sessionDate = new Date(startDate);
                    // Set sessionDate to the correct day of this week
                    sessionDate.setDate(startDate.getDate() + (sessionDay - startDate.getDay() + 7) % 7);

                    const [hours, minutes, seconds] = session.time.split(":").map(Number);
                    sessionDate.setHours(hours!, minutes!, seconds!, 0);

                    const startTime = new Date(sessionDate);
                    const endTime = addMinutes(startTime, session.duration);
                    const utcStartTime = fromZonedTime(startTime, location.timezone);
                    const utcEndTime = fromZonedTime(endTime, location.timezone);

                    const r = reservations.filter((r) => r.sessionId === session.id);
                    sessions.push({
                        ...session,
                        reservations: r,
                        program: program,
                        startTime,
                        endTime,
                        availability: program.capacity - r.length,
                        utcStartTime,
                        utcEndTime,
                    } as ExtendedProgramSession);
                });
            });


            return status(200, sessions);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Internal server error" });
        }
    }, SessionsProps)
}
