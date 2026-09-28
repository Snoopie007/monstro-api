import { db } from "@/db/db";
import { attendances, reservations } from "@subtrees/schemas";
import { and, eq } from "drizzle-orm";
import { differenceInMinutes } from "date-fns";
import { Elysia, t } from "elysia";
import { classQueue, rankQueue } from "@/queues";
import { WorkflowEvents } from "@subtrees/constants/workflow";
import { dispatchWorkflowTrigger } from "@subtrees/utils/server/workflows";
import type { AuthContext } from "@/middlewares/AuthMW";
import { canAccessLocation } from "@/utils/merchandise";


const LocationCheckinProps = {
    params: t.Object({
        lid: t.String(),
    }),
    body: t.Object({
        rid: t.String(),
    }),
};


export async function locationCheckin(app: Elysia) {
    return app.post('/checkin', async (context) => {
        const { body, params, status } = context;
        const actor = context as typeof context & AuthContext;
        const { lid } = params;
        const { rid } = body;

        try {
            const result = await db.transaction(async (tx) => {
                // Validate the same row that we are about to check in. A concurrent
                // cancellation must finish before this read or wait for this commit.
                const [reservation] = await tx.select().from(reservations)
                    .where(and(eq(reservations.id, rid), eq(reservations.locationId, lid)))
                    .for("update");
                if (!reservation) return { error: status(404, { error: "Reservation not found" }) };

                // Members check in themselves. Preserve staff QR scanning through
                // the existing active-staff/location rule, plus trusted service calls.
                if (actor.isServiceRole !== true && actor.memberId !== reservation.memberId) {
                    const userId = actor.userId;
                    const staff = userId ? await tx.query.staffs.findFirst({
                        where: (row, { eq }) => eq(row.userId, userId),
                        columns: { id: true },
                    }) : undefined;
                    const access = await canAccessLocation(lid, undefined, staff?.id, tx);
                    if (!access.allowed) return { error: status(403, { error: "Cannot check in this reservation" }) };
                }

                const [attendance] = await tx.select({ id: attendances.id }).from(attendances)
                    .where(eq(attendances.reservationId, rid));
                // Keep repeat handling ahead of status validation for completed check-ins.
                if (attendance) return { error: status(400, { error: "Already checked in for this session" }) };
                if (reservation.status !== "confirmed") {
                    return { error: status(400, { error: "Only confirmed reservations can be checked in" }) };
                }

                const now = new Date();
                const minutesUntilStart = differenceInMinutes(reservation.startOn, now);
                const minutesUntilEnd = differenceInMinutes(reservation.endOn, now);
                if (minutesUntilStart > 50 || minutesUntilEnd < 15) {
                    return { error: status(400, { error: "Cannot check in outside of session time" }) };
                }

                const rows = await tx.insert(attendances).values({
                    reservationId: rid,
                    locationId: lid,
                    memberId: reservation.memberId,
                    programId: reservation.programId,
                    programName: reservation.programName,
                    checkInTime: now,
                    startTime: reservation.startOn,
                    endTime: reservation.endOn,
                }).onConflictDoNothing().returning();
                const created = rows[0];
                if (created) {
                    await dispatchWorkflowTrigger(tx, {
                        type: WorkflowEvents.attendance.RECORDED,
                        locationId: created.locationId,
                        memberId: created.memberId,
                        attendanceId: created.id,
                    });
                }
                return { checkin: rows };
            });
            if ("error" in result) return result.error;
            const { checkin } = result;
            if (!checkin.length) return status(400, { error: "Already checked in for this session" });

            try {
                const attendance = checkin[0];

                if (attendance) {
                    const [hasRankProgram, memberInRank] = await Promise.all([
                        db.query.rankProcesses.findFirst({
                            where: (rp, { eq }) => eq(rp.locationId, lid),
                            columns: { id: true },
                        }),
                        db.query.memberRanks.findFirst({
                            where: (mr, { and, eq }) => and(
                                eq(mr.memberId, attendance.memberId),
                                eq(mr.locationId, lid),
                            ),
                            columns: { id: true },
                        }),
                    ]);

                    if (hasRankProgram && memberInRank) {
                        await rankQueue.add("attendance", {
                            attendanceId: attendance.id,
                        }, {
                            // BullMQ identity prevents duplicate queued jobs. Postgres
                            // also prevents reprocessing after this job is removed.
                            jobId: `rank-${attendance.id}`,
                        });
                    }
                }
            } catch (error) {
                console.error("[CHECKIN] Failed to enqueue rank attendance job:", error);
            }

            // Cancel the missed class check job since member checked in
            try {

                const job = await classQueue.getJob(`class:missed:${rid}`);
                if (job) {
                    await job.remove();
                    console.log(`Cancelled missed class check for reservation ${rid}`);
                }
            } catch (error) {
                console.error('Error cancelling missed class check:', error);
                // Don't fail the check-in if job cancellation fails
            }

            return status(200, checkin);
        } catch (err) {
            console.log(err);
            return status(500, { error: err });
        }
    }, LocationCheckinProps)
}
