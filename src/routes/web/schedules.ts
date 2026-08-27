import { db } from "@/db/db";
import { Elysia, t } from "elysia";
import { addMinutes, startOfWeek } from "date-fns";
import { findOverlappingLocationClosure } from "@subtrees/utils";
import { fromZonedTime } from 'date-fns-tz';
import { WebAuthMiddleware } from "@/middlewares/WebAuthMW";
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

export type LocationSchedulesResult =
    | { kind: "not_found" }
    | { kind: "inactive" }
    | { kind: "ok"; weekStart: Date; weekEnd: Date; sessions: MappedSession[] };

export async function getLocationSchedules(lid: string, date?: string): Promise<LocationSchedulesResult> {
    const refDate = new Date(date ?? new Date());
    const weekStart = startOfWeek(refDate, { weekStartsOn: 0 });
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
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
        return { kind: "not_found" };
    }
    if (location.locationState?.status !== "active") {
        return { kind: "inactive" };
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
        return { kind: "ok", weekStart, weekEnd, sessions: [] };
    }

    const closures = await db.query.locationClosures.findMany({
        where: (closure, { eq }) => eq(closure.locationId, lid),
    });
    const mappedSessions: MappedSession[] = [];
    programs.forEach((program) => {
        program.sessions.forEach((session) => {
            // session.day is 0 (Sunday) through 6 (Saturday)
            const sessionDay = typeof session.day === "number" ? session.day : 0;
            const sessionDate = new Date(weekStart);
            sessionDate.setDate(weekStart.getDate() + sessionDay);

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

            mappedSessions.push({
                id: `${program.id}-${session.id}`,
                name: program.name,
                minAge: program.minAge,
                maxAge: program.maxAge,
                utcStartTime,
                utcEndTime,
                isHoliday: Boolean(matchingClosure),
                isBlocked: Boolean(matchingClosure),
                holidayName: matchingClosure?.reason,
                day: sessionDate,
                description: program.description ?? "",
            });
        });
    });

    mappedSessions.sort((a, b) => a.utcStartTime.getTime() - b.utcStartTime.getTime());
    return { kind: "ok", weekStart, weekEnd, sessions: mappedSessions };
}

export const webLocationSchedulesRoutes = new Elysia({ prefix: "/schedules" })
    .use(WebAuthMiddleware)
    .get('/', async ({ status, query, lid }) => {
        if (!lid) {
            return status(401, { message: "No Location ID provided" });
        }


        try {
            const result = await getLocationSchedules(lid, query.date);
            if (result.kind === "not_found") {
                return status(404, { error: "Location not found" });
            }
            if (result.kind === "inactive") {
                return status(400, { error: "Location is not active" });
            }
            return status(200, {
                weekStart: result.weekStart,
                weekEnd: result.weekEnd,
                sessions: result.sessions,
            });
        } catch (error) {
            console.error(error);
            return status(500, { error: "Internal server error" });
        }
    }, {
        query: t.Object({
            date: t.Optional(t.String()),
        }),
    });
