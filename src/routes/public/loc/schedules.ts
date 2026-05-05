import { db } from "@/db/db";
import { Elysia, t } from "elysia";
import { addMinutes } from "date-fns";
import { COMMON_HOLIDAYS } from "@subtrees/constants/data";
import { findBlockedHoliday } from "@/libs/holidays";
import { fromZonedTime } from 'date-fns-tz';
type MappedSession = {
    id: string;
    name: string;
    minAge: number;
    maxAge: number;
    utcStartTime: Date;
    utcEndTime: Date;
    day: Date;
    isHoliday: boolean;
    isBlocked: boolean;
    holidayName?: string;
    description: string;
}

export async function publicLocationSchedulesRoutes(app: Elysia) {
    return app.group('/schedules', (app) => {
        app.get('/', async ({ params, status, query }) => {
            const { lid } = params;
            const { date } = query;


            const startDate = new Date(date ?? new Date());

            try {

                const location = await db.query.locations.findFirst({
                    where: (l, { eq }) => eq(l.id, lid),
                    columns: {
                        timezone: true,
                    },
                    with: {
                        locationState: true,
                    },
                });
                if (!location) {
                    return status(404, { error: "Location not found" });
                }
                if (location.locationState?.status !== "active") {
                    return status(400, { error: "Location is not active" });
                }
                const programs = await db.query.programs.findMany({
                    where: (p, { eq }) => eq(p.locationId, lid),
                    columns: {
                        id: true,
                        name: true,
                        description: true,
                        minAge: true,
                        maxAge: true,
                        instructorId: true,
                    },
                    with: {
                        sessions: true,
                    },
                });

                if (programs.length === 0) {
                    return status(200, { sessions: [] });
                }

                const holidays = location.locationState?.settings.holidays;
                let mappedSessions: MappedSession[] = [];
                programs.forEach((program) => {
                    program.sessions.forEach((session) => {
                        // session.day is 0 (Sunday) through 6 (Saturday)
                        // Find the next date in this week that matches session.day
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

                        const blockedHoliday = findBlockedHoliday(
                            sessionDate,
                            holidays?.blockedHolidays ?? [],
                            COMMON_HOLIDAYS);


                        mappedSessions.push({
                            id: `${program.id}-${session.id}`,
                            name: program.name,
                            minAge: program.minAge,
                            maxAge: program.maxAge,
                            utcStartTime: utcStartTime,
                            utcEndTime: utcEndTime,
                            isHoliday: blockedHoliday !== null,
                            isBlocked: blockedHoliday !== null,
                            holidayName: blockedHoliday?.name ?? undefined,
                            day: sessionDate, // actual date object of the session occurrence in this week
                            description: program.description ?? "",
                        });
                    });
                });
                return status(200, { sessions: mappedSessions });
            } catch (error) {
                console.error(error);
                return status(500, { error: "Internal server error" });
            }
        }, {
            params: t.Object({
                lid: t.String(),
            }),
            query: t.Object({
                date: t.String(),
            }),
        });
        return app;
    });
}