import { db } from "@/db/db";
import { attendances, memberPackages, reservations, recurringReservations, programSessions } from "@/db/schemas";
import type { Reservation } from "@/types/attendance";
import { isSameHour } from "date-fns";
import Elysia from "elysia";
import { eq } from "drizzle-orm";
import { emailQueue, classQueue } from "@/libs/queues";
import { z } from "zod";
const LocationCheckinProps = {
    body: z.object({
        reservationId: z.string(),
        isRecurring: z.boolean(),
        recurringId: z.string(),
        startOn: z.date(),
        endOn: z.date(),
        memberSubscriptionId: z.string(),
        memberPackageId: z.string(),
    }),
};


export async function locationCheckin(app: Elysia) {
    return app.post('/checkin', async ({ body, status }) => {
        const { reservationId, isRecurring, recurringId, startOn, endOn, ...rest } = body;

        try {
            let reservation: Reservation | undefined = undefined;

            if (recurringId) {
                const recurring = await db.query.recurringReservations.findFirst({
                    where: (r, { eq }) => eq(r.id, recurringId),
                    with: {
                        attendances: true,
                    },
                });
                if (recurring) {
                    const attendance = recurring?.attendances.find((a) =>
                        isSameHour(new Date(a.startTime), startOn)
                    );

                    reservation = {
                        ...recurring,
                        startOn,
                        endOn,
                        isRecurring,
                        recurringId: recurring.id,
                        attendance,
                    };
                }
            } else {
                reservation = await db.query.reservations.findFirst({
                    where: (r, { eq }) => eq(r.id, reservationId),
                    with: {
                        attendance: true,
                    },
                });
            }

            if (!reservation) {
                return status(404, { error: "Reservation not found" });
            }

            if (rest.memberSubscriptionId) {
                const sub = await db.query.memberSubscriptions.findFirst({
                    where: (ms, { eq }) => eq(ms.id, rest.memberSubscriptionId),
                });
                if (sub?.status !== "active") {
                    return status(400, { error: "Subscription is not active" });
                }
            } else {
                const pkg = await db.query.memberPackages.findFirst({
                    where: (mp, { eq }) => eq(mp.id, rest.memberPackageId),
                });
                if (pkg?.status !== "active") {
                    return status(400, { error: "Package is not active" });
                }

                if (pkg.totalClassAttended >= pkg.totalClassLimit) {
                    return status(400, { error: "Package class limit reached" });
                }
            }



            if (reservation.attendance) {
                return status(400, { error: "Already checked in for this session" });
            }

            // Look up program info from the session
            let programId: string | null = null;
            let programName: string | null = null;

            if (reservation.sessionId) {
                const sessionWithProgram = await db.query.programSessions.findFirst({
                    where: eq(programSessions.id, reservation.sessionId),
                    with: {
                        program: {
                            columns: { id: true, name: true }
                        }
                    }
                });
                programId = sessionWithProgram?.program?.id ?? null;
                programName = sessionWithProgram?.program?.name ?? null;
            }

            const checkin = await db.insert(attendances).values({
                reservationId: !reservation.isRecurring ? reservation.id : null,
                recurringId: reservation.isRecurring ? reservation.recurringId : null,
                programId,
                programName,
                locationId: reservation.locationId,
                memberId: reservation.memberId,
                checkInTime: new Date(),
                startTime: startOn,
                endTime: endOn,
            }).returning();

            // If this is a package reservation, increment the total class attended
            if (reservation.memberPackage) {
                await db
                    .update(memberPackages)
                    .set({
                        totalClassAttended:
                            (reservation.memberPackage.totalClassAttended || 0) + 1,
                    })
                    .where(eq(memberPackages.id, reservation.memberPackage.id));
            }

            // Get member and location info for trigger evaluation
            let memberInfo;
            if (reservation.isRecurring && reservation.recurringId) {
                memberInfo = await db.query.recurringReservations.findFirst({
                    where: eq(recurringReservations.id, reservation.recurringId),
                    with: {
                        member: true
                    }
                });
            } else {
                memberInfo = await db.query.reservations.findFirst({
                    where: eq(reservations.id, reservation.id),
                    with: {
                        member: true
                    }
                });
            }

            // Evaluate attendance triggers after successful check-in
            // TODO: Evaluate attendance triggers

            // Cancel the missed class check job since member checked in
            try {
                const reservationIdToCancel = reservation.isRecurring ? recurringId : reservationId;
                const jobId = `missed-class-${reservationIdToCancel}`;

                const job = await classQueue.getJob(jobId);
                if (job) {
                    await job.remove();
                    console.log(`📧 Cancelled missed class check for reservation ${reservationIdToCancel}`);
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