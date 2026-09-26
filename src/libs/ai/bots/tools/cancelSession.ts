import { db } from "@/db/db";
import { attendances, memberPackages, memberSubscriptions, reservations } from "@subtrees/schemas";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { and, eq, gt, sql } from "drizzle-orm";
import type { ToolArgs, ToolExecutorResult } from "../type";
import {
    argString,
    asString,
    actionCard,
    findMemberByName,
    jsonResult,
    memberFromArgs,
    memberLabel,
    parseTime,
    pauseAsk,
    pauseClarify,
} from "../utils";

function parseRefund(value: unknown): boolean | null {
    if (typeof value === "boolean") return value;
    const raw = asString(value).toLowerCase();
    if (["refund", "yes", "true", "credit"].includes(raw)) return true;
    if (["keep", "no", "false"].includes(raw)) return false;
    return null;
}

function parseReservationChip(value: string) {
    if (value.startsWith("refund:")) return { reservationId: value.slice(7), refund: true as const };
    if (value.startsWith("keep:")) return { reservationId: value.slice(5), refund: false as const };
    return { reservationId: value, refund: null };
}

function sessionLabel(reservation: { programName: string | null; startOn: Date }, timezone: string) {
    const local = toZonedTime(reservation.startOn, timezone);
    return `${reservation.programName || "Session"} · ${format(local, "EEE, MMM d · h:mm a")}`;
}

function creditKind(reservation: {
    memberPackageId: string | null;
    memberSubscription: { pricing: { plan: { classLimitInterval: string | null } | null } | null } | null;
}) {
    if (reservation.memberPackageId) return "package" as const;
    if (reservation.memberSubscription?.pricing?.plan?.classLimitInterval === "term") return "term" as const;
    return null;
}

export async function executeCancelSession(args: ToolArgs, lid: string): Promise<ToolExecutorResult> {
    const { memberId, name } = memberFromArgs(args);
    const program = asString(args.program);
    const time = parseTime(asString(args.time));
    const chip = parseReservationChip(argString(args, "reservationId", "rid"));
    let reservationId = chip.reservationId;
    const refund = chip.refund ?? (parseRefund(args.refundClassCredit) === true ? true : null);

    const location = await db.query.locations.findFirst({
        where: (row, { eq: eqLoc }) => eqLoc(row.id, lid),
        columns: { timezone: true },
    });
    const timezone = location?.timezone || "UTC";
    const now = new Date();

    if (!reservationId) {
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
                    label: [memberLabel(item), item.email].filter(Boolean).join(" · "),
                })),
            );
        }

        const upcoming = await db.query.reservations.findMany({
            where: (r, { and: andWhere, eq: eqCol }) => andWhere(
                eqCol(r.locationId, lid),
                eqCol(r.memberId, memberId),
                eqCol(r.status, "confirmed"),
                gt(r.startOn, now),
            ),
            columns: {
                id: true,
                programName: true,
                startOn: true,
            },
            orderBy: (r, { asc }) => asc(r.startOn),
            limit: 20,
        });

        const matches = upcoming.filter((item) => {
            if (program && !item.programName?.toLowerCase().includes(program.toLowerCase())) return false;
            if (time && format(toZonedTime(item.startOn, timezone), "HH:mm") !== time) return false;
            return true;
        });

        if (matches.length === 0) {
            return {
                content: jsonResult({
                    ok: false,
                    error: "No upcoming session found",
                    ui: actionCard(
                        "error",
                        program
                            ? `Couldn't find an upcoming ${program} session to cancel.`
                            : "This member has no upcoming sessions to cancel.",
                    ),
                }),
            };
        }

        if (matches.length > 1) {
            return pauseClarify(
                "Which session should I cancel?",
                matches.map((item) => ({
                    id: item.id,
                    label: sessionLabel(item, timezone),
                })),
            );
        }

        reservationId = matches[0]!.id;
    }

    const reservation = await db.query.reservations.findFirst({
        where: (r, { and: andWhere, eq: eqCol }) => andWhere(
            eqCol(r.id, reservationId),
            eqCol(r.locationId, lid),
            eqCol(r.status, "confirmed"),
        ),
        columns: {
            id: true,
            sessionId: true,
            programName: true,
            memberId: true,
            startOn: true,
            memberSubscriptionId: true,
            memberPackageId: true,
        },
        with: {
            attendance: true,
            memberSubscription: {
                columns: { id: true },
                with: {
                    pricing: {
                        columns: { id: true },
                        with: { plan: { columns: { classLimitInterval: true } } },
                    },
                },
            },
        },
    });

    if (!reservation) {
        return {
            content: jsonResult({
                ok: false,
                error: "That session is not available to cancel.",
                ui: actionCard("error", "Couldn't cancel that session it is no longer available."),
            }),
        };
    }

    if (reservation.attendance) {
        return {
            content: jsonResult({
                ok: false,
                error: "Session already attended",
                ui: actionCard("error", `Couldn't cancel ${sessionLabel(reservation, timezone)}it has already been attended.`),
            }),
        };
    }

    if (reservation.startOn.getTime() <= now.getTime()) {
        return {
            content: jsonResult({
                ok: false,
                error: "Session already started",
                ui: actionCard("error", `Couldn't cancel ${sessionLabel(reservation, timezone)} it has already started.`),
            }),
        };
    }

    const refundable = creditKind(reservation);
    const label = sessionLabel(reservation, timezone);

    if (refund === null) {
        return pauseClarify(
            `Cancel ${label}? Refund the class credit?`,
            [
                { id: `refund:${reservation.id}`, label: "Yes, cancel and refund class credit" },
                { id: `keep:${reservation.id}`, label: "Yes, cancel without refund" },
            ],
        );
    }

    await db.transaction(async (tx) => {
        await tx.update(reservations).set({
            status: "cancelled_by_vendor",
            cancelledAt: new Date(),
            cancelledReason: "Cancelled by staff",
            updated: new Date(),
        }).where(and(
            eq(reservations.id, reservation.id),
            eq(reservations.locationId, lid),
        ));


        if (!refund) return;

        if (refundable === "package" && reservation.memberPackageId) {
            await tx.update(memberPackages).set({
                totalClassAttended: sql`greatest(${memberPackages.totalClassAttended} - 1, 0)`,
                updated: new Date(),
            }).where(eq(memberPackages.id, reservation.memberPackageId));
        }

        if (refundable === "term" && reservation.memberSubscriptionId) {
            await tx.update(memberSubscriptions).set({
                classCredits: sql`${memberSubscriptions.classCredits} + 1`,
                updated: new Date(),
            }).where(eq(memberSubscriptions.id, reservation.memberSubscriptionId));
        }
    });

    const when = `${format(toZonedTime(reservation.startOn, timezone), "h:mm a")} ${reservation.programName || "class"}`;
    return {
        content: jsonResult({
            ok: true,
            status: "cancelled",
            reservationId: reservation.id,
            sessionId: reservation.sessionId,
            refundClassCredit: refund,
            ui: actionCard(
                "success",
                `Done. ${when} has been canceled.`,
                "session-cancelled",
                {
                    lid,
                    memberId: reservation.memberId,
                    sessionId: reservation.sessionId,
                    reservationId: reservation.id
                },
            ),
        }),
    };
}
