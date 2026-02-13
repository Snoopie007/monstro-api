import { db } from "@/db/db";
import type { ExtendedProgramSession } from "@subtrees/types";
import { addDays, addMinutes } from "date-fns";
import { Elysia, t } from "elysia";


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

            await db.query.locations.findFirst({
                where: (locations, { eq }) => eq(locations.id, lid),
                columns: {
                    timezone: true,
                },
            });

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



            const sessions: ExtendedProgramSession[] = [];

            programs.forEach((program) => {
                program.sessions.forEach((session) => {
                    const startTime = new Date();
                    const [hours, minutes, seconds] = session.time.split(":").map(Number);
                    startTime.setHours(hours!, minutes!, seconds!, 0);
                    const endTime = addMinutes(startTime, session.duration);

                    sessions.push({
                        ...session,
                        reservations: reservations.filter((r) => r.sessionId === session.id),
                        program: program,
                        startTime,
                        endTime,
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
