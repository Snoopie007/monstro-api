import { db } from "@/db/db";
import { Elysia, t } from "elysia";
import { addMinutes } from "date-fns";
import { COMMON_HOLIDAYS } from "@subtrees/constants/data";
import { findBlockedHoliday } from "@/libs/holidays";
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
    | { kind: "ok"; sessions: MappedSession[] };

export async function getLocationSchedules(lid: string, date?: string): Promise<LocationSchedulesResult> {
    const startDate = new Date(date ?? new Date());
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
        return { kind: "ok", sessions: [] };
    }

    const holidays = location.locationState?.settings.holidays;
    const mappedSessions: MappedSession[] = [];
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
                utcStartTime,
                utcEndTime,
                isHoliday: blockedHoliday !== null,
                isBlocked: blockedHoliday !== null,
                holidayName: blockedHoliday?.name ?? undefined,
                day: sessionDate,
                description: program.description ?? "",
            });
        });
    });

    return { kind: "ok", sessions: mappedSessions };
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
            return status(200, { sessions: result.sessions });
        } catch (error) {
            console.error(error);
            return status(500, { error: "Internal server error" });
        }
    }, {
        query: t.Object({
            date: t.String(),
        }),
    });