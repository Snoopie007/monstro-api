import { db } from "@/db/db";
import { memberSubscriptions, reservations } from "@subtrees/schemas";
import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { and, eq, gte, sql } from "drizzle-orm";
import type { ToolArgs, ToolExecutorResult } from "../type";
import {
    argString,
    asString,
    actionCard,
    findMemberByName,
    jsonResult,
    memberFromArgs,
    memberLabel,
    pauseAsk,
    pauseClarify,
} from "../utils";

function parseRefundClassCredit(value: unknown): boolean | null {
    if (typeof value === "boolean") return value;
    const raw = asString(value).toLowerCase();
    if (["refund", "yes", "true", "credit"].includes(raw)) return true;
    if (["keep", "no", "false"].includes(raw)) return false;
    return null;
}

function parseReservationArg(value: string) {
    if (value.startsWith("refund:")) return { reservationId: value.slice(7), refundClassCredit: true as const };
    if (value.startsWith("keep:")) return { reservationId: value.slice(5), refundClassCredit: false as const };
    return { reservationId: value, refundClassCredit: null };
}

export async function executeCancelSession(args: ToolArgs, locationId: string): Promise<ToolExecutorResult> {
    let { memberId, name } = memberFromArgs(args);
    const reservationArg = argString(args, "reservationId", "rid");
    const undoId = `${reservationArg} ${asString(args.name)}`.match(/undo booking ([A-Za-z0-9_]+)/i)?.[1] || "";
    const refundChip = [reservationArg, memberId, name, undoId]
        .map(parseReservationArg)
        .find((item) => item.refundClassCredit !== null);
    let reservationId = refundChip?.reservationId || undoId || reservationArg;
    const refundClassCredit = refundChip?.refundClassCredit
        ?? parseRefundClassCredit(args.refundClassCredit)
        ?? (undoId ? true : null);

    const location = await db.query.locations.findFirst({
        where: (row, { eq: eqLoc }) => eqLoc(row.id, locationId),
        columns: { timezone: true },
    });
    const timezone = location?.timezone || "UTC";
    const localStart = toZonedTime(new Date(), timezone);
    localStart.setHours(0, 0, 0, 0);
    const from = fromZonedTime(localStart, timezone);

    if (reservationId && refundClassCredit !== null) {
        const reservation = await db.query.reservations.findFirst({
            where: (r, { and: andWhere, eq: eqCol }) => andWhere(
                eqCol(r.id, reservationId),
                eqCol(r.locationId, locationId),
                eqCol(r.status, "confirmed"),
            ),
            columns: {
                id: true,
                sessionId: true,
                programName: true,
                startOn: true,
                memberSubscriptionId: true,
            },
        });
        if (!reservation) {
            return {
                content: jsonResult({
                    ok: false,
                    error: "That session is not available to cancel.",
                    ui: actionCard("error", "Couldn't cancel that session — it is no longer available."),
                }),
            };
        }

        await db.transaction(async (tx) => {
            await tx.update(reservations).set({
                status: "cancelled_by_vendor",
                cancelledAt: new Date(),
                cancelledReason: "Cancelled by staff assistant",
                updated: new Date(),
            }).where(and(
                eq(reservations.id, reservation.id),
                eq(reservations.locationId, locationId),
            ));

            if (refundClassCredit && reservation.memberSubscriptionId) {
                await tx.update(memberSubscriptions).set({
                    classCredits: sql`${memberSubscriptions.classCredits} + 1`,
                    updated: new Date(),
                }).where(eq(memberSubscriptions.id, reservation.memberSubscriptionId));
            }
        });

        const local = toZonedTime(reservation.startOn, timezone);
        const when = `${format(local, "h:mm a")} ${reservation.programName || "class"}`;
        return {
            content: jsonResult({
                ok: true,
                status: "cancelled",
                reservationId: reservation.id,
                sessionId: reservation.sessionId,
                refundClassCredit,
                ui: actionCard(
                    "success",
                    `Done. **${when}** has been canceled.`,
                ),
            }),
        };
    }

    if (reservationId) {
        const reservation = await db.query.reservations.findFirst({
            where: (r, { and: andWhere, eq: eqCol }) => andWhere(
                eqCol(r.id, reservationId),
                eqCol(r.locationId, locationId),
                eqCol(r.status, "confirmed"),
            ),
            columns: {
                id: true,
                programName: true,
                startOn: true,
            },
        });
        if (reservation) {
            const local = toZonedTime(reservation.startOn, timezone);
            const label = `${reservation.programName || "Session"} · ${format(local, "EEE, MMM d · h:mm a")}`;
            return pauseClarify(
                `Cancel ${label}? Refund the class credit?`,
                [
                    { id: `refund:${reservation.id}`, label: "Yes, cancel and refund class credit" },
                    { id: `keep:${reservation.id}`, label: "Yes, cancel without refund" },
                ],
            );
        }
        if (!memberId) memberId = reservationId;
        reservationId = "";
    }

    if (!memberId) {
        if (!name) return pauseAsk("What is the member's first and last name?");

        const matches = await findMemberByName(locationId, name);
        if (matches.length === 0) {
            return {
                content: jsonResult({
                    ok: false,
                    error: "We cannot find this member.",
                    ui: actionCard("error", "We cannot find this member."),
                }),
            };
        }
        return pauseClarify(
            matches.length === 1 ? "Is this the right member?" : "Which member did you mean?",
            matches.map((item) => ({
                id: item.id,
                label: [memberLabel(item), item.email].filter(Boolean).join(" · "),
            })),
        );
    }

    const upcoming = await db.query.reservations.findMany({
        where: (r, { and: andWhere, eq: eqCol }) => andWhere(
            eqCol(r.locationId, locationId),
            eqCol(r.memberId, memberId),
            eqCol(r.status, "confirmed"),
            gte(r.startOn, from),
        ),
        columns: {
            id: true,
            programName: true,
            startOn: true,
        },
        orderBy: (r, { asc }) => asc(r.startOn),
        limit: 20,
    });

    if (upcoming.length === 0) {
        return {
            content: jsonResult({
                ok: false,
                error: "This member has no upcoming sessions to cancel.",
                ui: actionCard("error", "This member has no upcoming sessions to cancel."),
            }),
        };
    }

    return pauseClarify(
        "Which session should I cancel?",
        upcoming.map((item) => {
            const local = toZonedTime(item.startOn, timezone);
            return {
                id: item.id,
                label: `${item.programName || "Session"} · ${format(local, "EEE, MMM d · h:mm a")}`,
            };
        }),
    );
}
