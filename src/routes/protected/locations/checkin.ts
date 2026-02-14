import { db } from "@/db/db";
import {
    attendances, reservations,
} from "@subtrees/schemas";
import type { MemberSubscription, MemberPackage, Reservation } from "@subtrees/types";
import { differenceInMinutes, isSameHour } from "date-fns";
import { Elysia, t } from "elysia";
import { sql } from "drizzle-orm";
import { classQueue } from "@/queues";


const LocationCheckinProps = {
    params: t.Object({
        lid: t.String(),
    }),
    body: t.Object({
        rid: t.String(),
    }),
};


export async function locationCheckin(app: Elysia) {
    return app.post('/checkin', async ({ body, params, status }) => {
        const { lid } = params;
        const { rid } = body;

        try {
            const reservation = await db.query.reservations.findFirst({
                where: (r, { eq }) => eq(r.id, rid),
                columns: {
                    memberPackageId: true,
                    memberSubscriptionId: true,
                    programId: true,
                    programName: true,
                    memberId: true,
                    sessionId: true,
                    startOn: true,
                    endOn: true,
                },
                extras: {
                    attendanceCount: sql<number>`(
                        SELECT COUNT(*)::int 
                        FROM ${attendances} 
                        WHERE ${attendances.reservationId} = ${reservations.id}
                    )`.as('attendance_count'),
                },
            });


            if (!reservation) {
                return status(404, { error: "Reservation not found" });
            }

            const { memberSubscriptionId, memberPackageId, attendanceCount, ...rest } = reservation;

            if (reservation.attendanceCount > 0) {
                return status(400, { error: "Already checked in for this session" });
            }

            const now = new Date();
            const minutesUntilStart = differenceInMinutes(reservation.startOn, now);
            const minutesUntilEnd = differenceInMinutes(reservation.endOn, now);

            const canCheckin = minutesUntilStart <= 50 && minutesUntilEnd >= 15;
            if (!canCheckin) {
                return status(400, { error: "Cannot check in outside of session time" });
            }


            let memberPlan: MemberSubscription | MemberPackage | undefined = undefined;
            if (memberSubscriptionId) {
                memberPlan = await db.query.memberSubscriptions.findFirst({
                    where: (ms, { eq }) => eq(ms.id, memberSubscriptionId),
                });
            }

            if (memberPackageId) {
                memberPlan = await db.query.memberPackages.findFirst({
                    where: (mp, { eq }) => eq(mp.id, memberPackageId),
                });
            }

            if (!memberPlan || memberPlan.status !== "active") {
                return status(400, { error: "Member plan is not active" });
            }

            const checkin = await db.insert(attendances).values({
                ...rest,
                locationId: lid,
                checkInTime: now,
                startTime: rest.startOn,
                endTime: rest.endOn,
            }).returning();

            // Evaluate attendance triggers after successful check-in
            // TODO: Evaluate attendance triggers

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