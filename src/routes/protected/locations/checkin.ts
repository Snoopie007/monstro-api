import { db } from "@/db/db";
import {
    attendances, reservations,
} from "@subtrees/schemas";
import type { MemberSubscription, MemberPackage, Reservation } from "@subtrees/types";
import { isSameHour } from "date-fns";
import { Elysia, t } from "elysia";
import { sql } from "drizzle-orm";
import { classQueue } from "@/queues";


const LocationCheckinProps = {
    params: t.Object({
        lid: t.String(),
    }),
    body: t.Object({
        rid: t.String(),
        startOn: t.Date(),
        endOn: t.Date(),
    }),
};


export async function locationCheckin(app: Elysia) {
    return app.post('/checkin', async ({ body, params, status }) => {
        const { lid } = params;
        const { rid, startOn, endOn } = body;

        try {
            const reservation = await db.query.reservations.findFirst({
                where: (r, { eq }) => eq(r.id, rid),
                columns: {
                    id: true,
                    memberPackageId: true,
                    memberSubscriptionId: true,
                    programId: true,
                    programName: true,
                    memberId: true,
                    sessionId: true,
                },
                extras: {
                    attendanceCount: sql<number>`(
                        SELECT COUNT(*)::int 
                        FROM ${attendances} 
                        WHERE ${attendances.reservationId} = ${reservations.id}
                    )`.as('attendance_count'),
                },
            });

            console.log(reservation);

            if (!reservation) {
                return status(404, { error: "Reservation not found" });
            }


            if (reservation.attendanceCount > 0) {
                return status(400, { error: "Already checked in for this session" });
            }

            const { memberSubscriptionId, memberPackageId, ...rest } = reservation;


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
                reservationId: reservation.id,
                programId: reservation.programId,
                programName: reservation.programName,
                memberId: reservation.memberId,
                locationId: lid,
                checkInTime: new Date(),
                startTime: startOn,
                endTime: endOn,
            }).returning();



            const member = await db.query.members.findFirst({
                where: (m, { eq }) => eq(m.id, reservation.memberId),
                columns: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                },
            });

            // Evaluate attendance triggers after successful check-in
            // TODO: Evaluate attendance triggers

            // Cancel the missed class check job since member checked in
            try {
                const jobId = `missed:checkin:${rid}`;

                const job = await classQueue.getJob(jobId);
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