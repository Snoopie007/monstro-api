import { db } from "@/db/db";
import { findOverlappingLocationClosure } from "@subtrees/utils";
import { memberPlanPricing, planPrograms } from "@subtrees/schemas";
import { addDays, addMinutes, endOfDay, startOfWeek } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";

const memberColumns = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    phone: true,
} as const;

const pricingColumns = {
    id: true,
    name: true,
    price: true,
} as const;

export const slProgramRoutes = new Elysia({ prefix: "/programs" })
    .get("/sessions", async ({ params, query, status }) => {
        const { lid } = params;
        const { date } = query;

        try {
            const startDate = new Date(date);
            const weekStart = startOfWeek(startDate, { weekStartsOn: 0 });
            const weekEnd = endOfDay(addDays(weekStart, 6));

            const location = await db.query.locations.findFirst({
                where: (l, { eq: eqLoc }) => eqLoc(l.id, lid),
                columns: {
                    id: true,
                    timezone: true,
                },
            });
            if (!location) {
                return status(404, { error: "Location not found" });
            }

            const programs = await db.query.programs.findMany({
                where: (p, { and, eq: eqCol }) => and(
                    eqCol(p.locationId, lid),
                    eqCol(p.status, "active"),
                ),
                with: {
                    sessions: {
                        with: {
                            staff: {
                                columns: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                },
                            },
                        },
                    },
                },
            });

            const reservations = await db.query.reservations.findMany({
                where: (r, { and, eq: eqCol, gte, lte }) => and(
                    eqCol(r.locationId, lid),
                    gte(r.startOn, weekStart),
                    lte(r.startOn, weekEnd),
                ),
                with: {
                    attendance: true,
                },
            });

            const closures = await db.query.locationClosures.findMany({
                where: (closure, { eq: eqCol }) => eqCol(closure.locationId, lid),
            });

            const result = programs.map((program) => {
                const sessions = program.sessions.map((session) => {
                    const sessionDay = typeof session.day === "number" ? session.day : 0;
                    const sessionDate = new Date(weekStart);
                    sessionDate.setDate(weekStart.getDate() + sessionDay);

                    const [hours, minutes, seconds] = session.time.split(":").map(Number);
                    sessionDate.setHours(hours ?? 0, minutes ?? 0, seconds ?? 0, 0);

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

                    const matchingReservations = reservations.filter((reservation) =>
                        reservation.sessionId === session.id
                        && reservation.startOn.getTime() === utcStartTime.getTime(),
                    );

                    return {
                        ...session,
                        startTime,
                        endTime,
                        utcStartTime,
                        utcEndTime,
                        holidayName: matchingClosure?.reason,
                        reservations: matchingReservations,
                        availability: Math.max(program.capacity - matchingReservations.length, 0),
                    };
                }).sort((a, b) => a.utcStartTime.getTime() - b.utcStartTime.getTime());

                const { sessions: _sessions, ...rest } = program;
                return {
                    ...rest,
                    sessions,
                };
            });

            return status(200, result);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch calendar events" });
        }
    }, {
        params: t.Object({
            lid: t.String(),
            staffId: t.Optional(t.String()),
        }),
        query: t.Object({
            date: t.String(),
        }),
    })
    .group("/:programId", (app) => {
        app.get("/members/plans", async ({ params, status }) => {
            const { programId } = params;

            try {
                const pricingIdsForProgram = db
                    .select({ id: memberPlanPricing.id })
                    .from(memberPlanPricing)
                    .innerJoin(
                        planPrograms,
                        eq(planPrograms.planId, memberPlanPricing.memberPlanId),
                    )
                    .where(eq(planPrograms.programId, programId));

                const [subscriptions, packages] = await Promise.all([
                    db.query.memberSubscriptions.findMany({
                        where: (s, { and, eq: eqCol, inArray, isNull }) => and(
                            inArray(s.memberPlanPricingId, pricingIdsForProgram),
                            eqCol(s.status, "active"),
                            isNull(s.parentId),
                        ),
                        with: {
                            member: { columns: memberColumns },
                            pricing: { columns: pricingColumns },
                            reservations: {
                                where: (r, { and, eq: eqCol, inArray }) => and(
                                    eqCol(r.programId, programId),
                                    inArray(r.status, ["confirmed", "completed"]),
                                ),
                                columns: { id: true },
                            },
                        },
                    }),
                    db.query.memberPackages.findMany({
                        where: (p, { and, eq: eqCol, inArray, isNull }) => and(
                            inArray(p.memberPlanPricingId, pricingIdsForProgram),
                            eqCol(p.status, "active"),
                            isNull(p.parentId),
                        ),
                        with: {
                            member: { columns: memberColumns },
                            pricing: { columns: pricingColumns },
                        },
                    }),
                ]);

                return status(200, [...subscriptions, ...packages]);
            } catch (error) {
                console.error(error);
                return status(500, { error: "Failed to fetch program" });
            }
        }, {
            params: t.Object({
                programId: t.String(),
                staffId: t.String(),
                lid: t.String(),
            }),
        });
        return app;
    });
