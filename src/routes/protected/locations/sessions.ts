import { db } from "@/db/db";
import { findOverlappingLocationClosure } from "@subtrees/utils";
import { reservations } from "@subtrees/schemas";
import type { ExtendedProgramSession } from "@subtrees/types";
import { addDays, addMinutes, format, startOfWeek } from "date-fns";
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { and, eq, gte, isNotNull, sql } from "drizzle-orm";
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

const SessionsCountProps = {
    params: t.Object({
        lid: t.String(),
    }),
    query: t.Object({
        fromDate: t.Optional(t.String()),
    }),
};
export async function locationSessions(app: Elysia) {
    app.get('/sessions', async ({ params, status, query }) => {
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

            const closures = await db.query.locationClosures.findMany({
                where: (closure, { eq, and, or, gte, isNotNull }) => and(
                    eq(closure.locationId, lid),
                    or(
                        isNotNull(closure.recurrencePattern),
                        gte(closure.startsAt, startDate),
                    ),
                ),
            });
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

                    const matchingClosure = findOverlappingLocationClosure(
                        closures,
                        utcStartTime,
                        utcEndTime,
                        location.timezone,
                    );

                    const r = reservations.filter((r) => r.sessionId === session.id);
                    sessions.push({
                        ...session,
                        reservations: r,
                        program: program,
                        startTime,
                        endTime,
                        holidayName: matchingClosure?.reason,
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

    app.get('/sessions/counts', async ({ params, query, status }) => {
        const { lid } = params;
        const { fromDate } = query;
        const anchor = fromDate ? new Date(fromDate) : new Date();

        if (Number.isNaN(anchor.getTime())) {
            return status(400, { error: "Invalid request" });
        }

        try {
            const location = await db.query.locations.findFirst({
                where: (locations, { eq }) => eq(locations.id, lid),
                columns: { timezone: true },
            });
            if (!location) {
                return status(404, { error: "Location not found" });
            }

            const weekStart = fromZonedTime(
                startOfWeek(toZonedTime(anchor, location.timezone), { weekStartsOn: 0 }),
                location.timezone,
            );

            const rows = await db
                .select({
                    sessionId: reservations.sessionId,
                    startOn: reservations.startOn,
                    reservedCount: sql<number>`count(*)::int`,
                })
                .from(reservations)
                .where(
                    and(
                        eq(reservations.locationId, lid),
                        eq(reservations.status, "confirmed"),
                        isNotNull(reservations.sessionId),
                        gte(reservations.startOn, weekStart),
                    ),
                )
                .groupBy(reservations.sessionId, reservations.startOn);

            return status(200, rows.map((row) => ({
                sessionId: row.sessionId,
                date: format(toZonedTime(row.startOn, location.timezone), "yyyy-MM-dd"),
                reservedCount: row.reservedCount,
            })));
        } catch (error) {
            console.error(error);
            return status(500, { error: "Internal server error" });
        }
    }, SessionsCountProps)
    app.group("/:sessionId", (app) => {
        app.get("/reservations", async ({ params, query, status }) => {
            const { sessionId } = params;
            const { date } = query;

            const startDate = new Date(date);
            try {

                const reservations = await db.query.reservations.findMany({
                    where: (r, { eq, and, gte }) => and(
                        eq(r.sessionId, sessionId),
                        gte(r.startOn, startDate),
                    ),
                    with: {
                        member: {
                            columns: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                phone: true,
                            },
                            with: {
                                user: {
                                    columns: {
                                        id: true,
                                        username: true,
                                        image: true,
                                    },
                                },
                            },
                        },
                    },
                });


                return status(200, reservations);
            } catch (error) {
                console.error(error);
                return status(500, { error: "Failed to fetch reservations" });
            }
        }, {
            params: t.Object({
                sessionId: t.String(),
            }),
            query: t.Object({
                date: t.String(),
            }),
        });
        return app;
    });

    return app;
}
