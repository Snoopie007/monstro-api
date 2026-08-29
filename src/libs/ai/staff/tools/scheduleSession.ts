import { db } from "@/db/db";
import { getSessionState } from "@/routes/protected/locations/reservations/utils";
import { memberPackages, memberSubscriptions, reservations } from "@subtrees/schemas";
import type { LocationClosure, SessionException } from "@subtrees/types";
import { findOverlappingLocationClosure } from "@subtrees/utils";
import { addMinutes, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { and, count, eq, gte, inArray, lte } from "drizzle-orm";
import type { ToolArgs, ToolExecutorResult } from "../type";
import {
    actionCard,
    asString,
    findMemberByName,
    jsonResult,
    memberFromArgs,
    parseTime,
    pauseAsk,
    pauseClarify,
} from "../utils";

type SessionTemplate = { id: string; day: number; time: string; duration: number };
type ExceptionRow = Pick<SessionException, "sessionId" | "originalDate" | "startsAt" | "endsAt" | "isCancelled" | "reason">;
type ExceptionMap = Map<string, ExceptionRow>;

type ScheduleLookups = {
    sessions: SessionTemplate[];
    timezone: string;
    time: string;
    closures: LocationClosure[];
    exceptions: ExceptionMap;
};

function exceptionKey(sessionId: string, date: string) {
    return `${sessionId}|${date}`;
}

function formatTime(time: string) {
    const [hours, minutes] = time.split(":").map(Number);
    const hour = hours ?? 0;
    const suffix = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${String(minutes ?? 0).padStart(2, "0")} ${suffix}`;
}

function templateWindow(session: SessionTemplate, date: string, timezone: string) {
    const [year, month, day] = date.split("-").map(Number);
    const [hours, minutes] = session.time.split(":").map(Number);
    const startOn = fromZonedTime(
        new Date(year ?? 0, (month ?? 1) - 1, day ?? 1, hours ?? 0, minutes ?? 0, 0, 0),
        timezone,
    );
    return { startOn, endOn: addMinutes(startOn, session.duration) };
}

function occurrenceWindow(
    session: SessionTemplate,
    date: string,
    timezone: string,
    exception: ExceptionRow | undefined,
) {
    if (exception?.isCancelled) return null;
    if (exception) return { startOn: exception.startsAt, endOn: exception.endsAt };
    return templateWindow(session, date, timezone);
}

function isOpen(
    session: SessionTemplate,
    date: string,
    lookups: ScheduleLookups,
) {
    const window = occurrenceWindow(
        session,
        date,
        lookups.timezone,
        lookups.exceptions.get(exceptionKey(session.id, date)),
    );
    if (!window) return false;
    return !findOverlappingLocationClosure(
        lookups.closures,
        window.startOn,
        window.endOn,
        lookups.timezone,
    );
}

function classDateOptions(lookups: ScheduleLookups) {
    const options: Array<{ id: string; label: string }> = [];
    for (let offset = 0; options.length < 5 && offset < 28; offset += 1) {
        const local = toZonedTime(new Date(), lookups.timezone);
        local.setDate(local.getDate() + offset);
        const date = format(local, "yyyy-MM-dd");
        const weekday = local.getDay();
        const available = lookups.sessions.some((session) => {
            if (session.day !== weekday) return false;
            if (lookups.time && session.time.slice(0, 5) !== lookups.time) return false;
            return isOpen(session, date, lookups);
        });
        if (!available) continue;
        options.push({
            id: date,
            label: offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : format(local, "EEE, MMM d"),
        });
    }
    return options;
}

function classTimeOptions(
    sessions: SessionTemplate[],
    programName: string,
    date: string,
    lookups: ScheduleLookups,
) {
    return [...sessions]
        .filter((session) => isOpen(session, date, lookups))
        .sort((a, b) => a.time.localeCompare(b.time))
        .map((session) => {
            const exception = lookups.exceptions.get(exceptionKey(session.id, date));
            const clock = exception && !exception.isCancelled
                ? format(toZonedTime(exception.startsAt, lookups.timezone), "HH:mm")
                : session.time.slice(0, 5);
            return {
                id: session.id,
                label: `${formatTime(clock)} · ${programName}`,
            };
        });
}

function periodBounds(startOn: Date, timezone: string, interval: "week" | "month") {
    const local = toZonedTime(startOn, timezone);
    const start = interval === "week" ? startOfWeek(local) : startOfMonth(local);
    const end = interval === "week" ? endOfWeek(local) : endOfMonth(local);
    return {
        from: fromZonedTime(start, timezone),
        to: fromZonedTime(end, timezone),
    };
}

async function countMemberSessionInPeriod(props: {
    memberId: string;
    sessionId: string;
    startOn: Date;
    timezone: string;
    interval: "week" | "month";
}) {
    const { from, to } = periodBounds(props.startOn, props.timezone, props.interval);
    const [row] = await db
        .select({ n: count() })
        .from(reservations)
        .where(and(
            eq(reservations.memberId, props.memberId),
            eq(reservations.sessionId, props.sessionId),
            inArray(reservations.status, ["confirmed", "completed"]),
            gte(reservations.startOn, from),
            lte(reservations.startOn, to),
        ));
    return Number(row?.n ?? 0);
}

export async function executeScheduleSession(args: ToolArgs, lid: string): Promise<ToolExecutorResult> {
    const { memberId, name } = memberFromArgs(args);
    let programId = asString(args.programId);
    const programName = asString(args.program);
    const time = parseTime(asString(args.time));
    let date = asString(args.date);
    const pickedSessionId = asString(args.sessionId);
    let memberPlanId = asString(args.memberPlanId);

    // 1. Member
    if (!memberId) {
        if (!name) return pauseAsk("What is the member's first and last name?");
        const matches = await findMemberByName(lid, name);
        if (matches.length === 0) {
            return pauseAsk("I couldn't find that member. What is the first and last name?");
        }
        return pauseClarify(
            "Which member did you mean?",
            matches.map((item) => ({
                id: item.id,
                label: [[item.firstName, item.lastName].filter(Boolean).join(" "), item.email].filter(Boolean).join(" · "),
            })),
        );
    }

    // 2. Program — id from a chip, or look up a typed name. Never guess from the member's plans.
    if (!programId && !programName) {
        return pauseAsk("Which class should I book?");
    }

    if (!programId && programName) {
        const matches = await db.query.programs.findMany({
            where: (p, { and, eq, ilike }) => and(
                eq(p.locationId, lid),
                eq(p.status, "active"),
                ilike(p.name, `%${programName}%`),
            ),
            columns: { id: true, name: true },
            limit: 8,
        });

        if (matches.length === 0) {
            return pauseAsk("I couldn't find that class. What's the program name?");
        }
        if (matches.length > 1) {
            return pauseClarify(
                "Which class did you mean?",
                matches.map((item) => ({ id: item.id, label: item.name })),
            );
        }
        programId = matches[0]!.id;
    }

    const program = await db.query.programs.findFirst({
        where: (p, { and, eq }) => and(
            eq(p.id, programId),
            eq(p.locationId, lid),
            eq(p.status, "active"),
        ),
        columns: { id: true, name: true, capacity: true },
        with: {
            sessions: {
                columns: { id: true, day: true, time: true, duration: true },
            },
        },
    });

    if (!program) {
        return pauseAsk("I couldn't find that class. What's the program name?");
    }

    if (program.sessions.length === 0) {
        return {
            content: jsonResult({
                ok: false,
                error: `${program.name} has no class times`,
                ui: actionCard("error", `Couldn't book — **${program.name}** has no class times.`),
            }),
        };
    }

    // 3. Pricing for this program, then this member's matching sub / package
    const pps = await db.query.planPrograms.findMany({
        where: (row, { eq }) => eq(row.programId, program.id),
        columns: { planId: true },
    });
    const planIds = pps.map((pp) => pp.planId);
    const pricings = planIds.length === 0 ? [] : await db.query.memberPlanPricing.findMany({
        where: (p, { inArray }) => inArray(p.memberPlanId, planIds),
        columns: { id: true },
    });
    const pricingIds = pricings.map((p) => p.id);


    if (pricingIds.length === 0) {
        return pauseAsk(`There are no plans for this class. Try another class?`);
    }

    const [subs, pkgs] = await Promise.all([
        db.query.memberSubscriptions.findMany({
            where: (s, { and, eq }) => and(
                eq(s.memberId, memberId),
                eq(s.locationId, lid),
                eq(s.status, "active"),
                inArray(s.memberPlanPricingId, pricingIds),
            ),
            columns: { id: true, classCredits: true },
            with: {
                pricing: {
                    columns: { id: true },
                    with: {
                        plan: {
                            columns: {
                                name: true,
                                totalClassLimit: true,
                                classLimitInterval: true
                            }
                        }
                    },
                },
            },
        }),
        db.query.memberPackages.findMany({
            where: (p, { and, eq }) => and(
                eq(p.memberId, memberId),
                eq(p.locationId, lid),
                eq(p.status, "active"),
                inArray(p.memberPlanPricingId, pricingIds),
            ),
            columns: { id: true, totalClassAttended: true, totalClassLimit: true },
            with: {
                pricing: {
                    columns: { id: true },
                    with: { plan: { columns: { name: true } } },
                },
            },
        }),
    ]);

    if (subs.length === 0 && pkgs.length === 0) {
        return pauseAsk(`This member is not enrolled in ${program.name}. Try another class?`);
    }

    const memberPlans = [...subs, ...pkgs];
    if (memberPlanId && !memberPlans.some((item) => item.id === memberPlanId)) {
        memberPlanId = "";
    }

    if (!memberPlanId && memberPlans.length > 1) {
        return pauseClarify(
            "Which plan should I book?",
            memberPlans.map((item) => ({
                id: `plan:${item.id}`,
                label: item.pricing?.plan?.name || ("totalClassAttended" in item ? "Package" : "Subscription"),
            })),
        );
    }

    const selectedPlan = memberPlanId
        ? memberPlans.find((item) => item.id === memberPlanId)!
        : memberPlans[0]!;


    // 4. Date: omit → today;
    // AI should pass yyyy-MM-dd. Match sessions; if none, offer the next 5 open dates.
    const location = await db.query.locations.findFirst({
        where: (row, { eq: eqLoc }) => eqLoc(row.id, lid),
        columns: { timezone: true },
        with: {
            locationClosures: true,
        },
    });

    const timezone = location?.timezone || "UTC";
    const today = format(toZonedTime(new Date(), timezone), "yyyy-MM-dd");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) date = today;

    const exceptionRows = await db.query.sessionExceptions.findMany({
        where: (se, { and, eq, inArray, gte }) => and(
            eq(se.locationId, lid),
            inArray(se.sessionId, program.sessions.map((session) => session.id)),
            gte(se.originalDate, today),
        ),
        columns: {
            sessionId: true,
            originalDate: true,
            startsAt: true,
            endsAt: true,
            isCancelled: true,
            reason: true,
        },
    });

    const lookups: ScheduleLookups = {
        sessions: program.sessions,
        timezone,
        time,
        closures: location?.locationClosures ?? [],
        exceptions: new Map(
            exceptionRows.map((row) => [exceptionKey(row.sessionId, row.originalDate), row]),
        ),
    };

    const [year, month, day] = date.split("-").map(Number);
    const weekday = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1).getDay();
    const daySessions = program.sessions.filter((session) => session.day === weekday);
    let matching = time
        ? daySessions.filter((session) => session.time.slice(0, 5) === time)
        : daySessions;
    if (pickedSessionId) matching = matching.filter((session) => session.id === pickedSessionId);
    matching = matching.filter((session) => isOpen(session, date, lookups));

    if (matching.length !== 1) {
        const candidates = matching.length > 1 ? matching : daySessions;
        const timeChoices = classTimeOptions(candidates, program.name, date, lookups);
        if (timeChoices.length === 1) {
            matching = candidates.filter((session) => session.id === timeChoices[0]!.id);
        } else if (timeChoices.length > 1) {
            return pauseClarify("Which time should I book?", timeChoices);
        } else {
            return pauseClarify(
                date === today
                    ? `No ${program.name} classes today. Pick another date.`
                    : `No ${program.name} classes on ${date}. Pick another date.`,
                classDateOptions(lookups),
            );
        }
    }

    const selectedSession = matching[0]!;
    const exception = lookups.exceptions.get(exceptionKey(selectedSession.id, date));
    const window = occurrenceWindow(selectedSession, date, timezone, exception);
    if (!window) {
        return pauseClarify(
            exception?.reason
                ? `${program.name} is cancelled (${exception.reason}). Pick another date.`
                : `No ${program.name} classes on ${date}. Pick another date.`,
            classDateOptions(lookups),
        );
    }

    const closure = findOverlappingLocationClosure(
        lookups.closures,
        window.startOn,
        window.endOn,
        timezone,
    );
    if (closure) {
        return pauseClarify(
            `No ${program.name} on ${date} (${closure.reason}). Pick another date.`,
            classDateOptions(lookups),
        );
    }

    const { startOn, endOn } = window;
    const displayTime = formatTime(
        exception
            ? format(toZonedTime(exception.startsAt, timezone), "HH:mm")
            : selectedSession.time.slice(0, 5),
    );

    const { isFull, isReserved } = await getSessionState({
        startTime: startOn,
        sessionId: selectedSession.id,
        memberId,
        capacity: program.capacity,
    });

    if (isReserved) {
        return {
            content: jsonResult({
                ok: false,
                error: "Already booked",
                ui: actionCard("error", `Couldn't book ${name}, already in ${displayTime} ${program.name}.`),
            }),
        };
    }
    if (isFull) {
        return {
            content: jsonResult({
                ok: false,
                error: "Class is full",
                memberId,
                sessionId: selectedSession.id,
                ui: actionCard(
                    "error",
                    `Couldn't book ${name}, class is full.`,
                    "retry-booking",
                    {
                        memberId,
                        program: program.name,
                        programId: program.id,
                    },
                ),
            }),
        };
    }



    const isPackage = "totalClassAttended" in selectedPlan;

    if (isPackage) {
        if (selectedPlan.totalClassAttended >= selectedPlan.totalClassLimit) {
            return {
                content: jsonResult({
                    ok: false,
                    error: "Class limit reached",
                    ui: actionCard("error", `Couldn't book ${name}, package class limit reached.`),
                }),
            };
        }
    } else {

        const classLimitInterval = selectedPlan.pricing?.plan?.classLimitInterval;
        const totalClassLimit = selectedPlan.pricing?.plan?.totalClassLimit;

        if (classLimitInterval === "term" && selectedPlan.classCredits === 0) {
            return {
                content: jsonResult({
                    ok: false,
                    error: "No credits available",
                    ui: actionCard("error", `Couldn't book ${name}, no class credits left.`),
                }),
            };
        }

        if (
            (classLimitInterval === "week" || classLimitInterval === "month")
            && totalClassLimit != null
        ) {
            const used = await countMemberSessionInPeriod({
                memberId,
                sessionId: selectedSession.id,
                startOn,
                timezone,
                interval: classLimitInterval,
            });
            if (used >= totalClassLimit) {
                const period = classLimitInterval === "week" ? "weekly" : "monthly";
                return {
                    content: jsonResult({
                        ok: false,
                        error: "Class limit reached",
                        ui: actionCard("error", `Couldn't book ${name}, ${period} class limit reached.`),
                    }),
                };
            }
        }
    }

    const reservationId = await db.transaction(async (tx) => {
        const rows = await tx.insert(reservations).values({
            memberId,
            locationId: lid,
            programName: program.name,
            sessionId: selectedSession.id,
            startOn,
            endOn,
            programId: program.id,
            ...(isPackage
                ? { memberPackageId: selectedPlan.id }
                : { memberSubscriptionId: selectedPlan.id }),
        }).returning({ id: reservations.id });

        const reservation = rows[0];
        if (!reservation) throw new Error("Failed to create reservation");
        if (isPackage) {
            await tx.update(memberPackages).set({
                totalClassAttended: selectedPlan.totalClassAttended + 1,
                updated: new Date(),
            }).where(eq(memberPackages.id, selectedPlan.id));
        } else if (selectedPlan.pricing?.plan?.classLimitInterval === "term") {
            await tx.update(memberSubscriptions).set({
                classCredits: Math.max(selectedPlan.classCredits - 1, 0),
                updated: new Date(),
            }).where(eq(memberSubscriptions.id, selectedPlan.id));
        }

        return reservation.id;
    });

    return {
        content: jsonResult({
            ok: true,
            status: "booked",
            sessionId: selectedSession.id,
            memberId,
            ui: actionCard(
                "success",
                `Done. ${name} is booked into ${displayTime} ${program.name}.`,
                "session-booked",
                { sessionId: selectedSession.id, reservationId },
            ),
        }),
    };
}
