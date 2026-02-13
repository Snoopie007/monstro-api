
import type { Elysia } from "elysia";
import { db } from "@/db/db";
import type {
    Reservation
} from "@subtrees/types";
import {
    recurringReservations, reservationExceptions,
} from "@subtrees/schemas";
import { getMemberPlan, getSessionState } from "./utils";
import { eq } from "drizzle-orm";
import { classQueue } from "@/queues";
import { z } from "zod";
import { addMinutes } from "date-fns";
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';


const ReservationsProps = {
    params: z.object({
        lid: z.string(),
    }),
    body: z.object({
        memberPlanId: z.string(),
        date: z.string(),
        session: z.object({
            id: z.string(),
            programId: z.string(),
            duration: z.number(),
            time: z.string(),
            staffId: z.string(),
        }),
    }),
};
export async function recurringReservationRoutes(app: Elysia) {
    app.post('/', async ({ body, params, status }) => {
        const perfStart = performance.now();
        const { lid } = params;
        const { memberPlanId, date, session } = body;
        const isPackage = memberPlanId.startsWith("pkg_");
        try {

            const memberPlan = await getMemberPlan(memberPlanId);
            const perfMemberPlan = performance.now();
            console.log(`⏱️  [PERF] Member plan query: ${(perfMemberPlan - perfStart).toFixed(2)}ms`);

            const location = memberPlan.location;
            const memberId = memberPlan.memberId;
            const now = toZonedTime(new Date(), location!.timezone);

            if (!location) {
                throw new Error("Location not found");
            }
            // location time
            const locationTime = formatInTimeZone(`${date}T${session.time}`, location!.timezone, 'yyyy-MM-dd HH:mm:ss');
            const startTime = new Date(locationTime);
            const endTime = addMinutes(startTime, session.duration);


            // Check if session is in the past
            const isPasted = startTime.getTime() < now.getTime();
            if (isPasted) {
                return status(200, { success: false, message: "This session is in the past." });
            }
            // Check session state
            const { isFull, isReserved } = await getSessionState({
                startTime,
                sessionId: session.id,
                programId: session.programId,
                memberId
            });
            if (isFull || isReserved) {
                const error = isReserved ? "Session is already reserved" : "Session is full";
                return status(200, { success: false, message: error });
            }


            const [recurringReservation] = await db.insert(recurringReservations).values({
                memberId,
                locationId: lid,
                sessionId: session.id,
                startDate: startTime,
                programId: session.programId,
                staffId: session.staffId,
                ...(isPackage) ? {
                    memberPackageId: memberPlan.id,
                } : {
                    memberSubscriptionId: memberPlan.id,
                }
            }).returning();

            if (!recurringReservation) {
                return status(500, { error: "Failed to create recurring reservation" });
            }

            const virtualReservation: Reservation = {
                ...recurringReservation,
                id: `${recurringReservation.id}+${startTime.toISOString()}`,
                startOn: startTime,
                endOn: endTime,
                status: 'confirmed',
                isMakeUpClass: false,
                created: new Date(),
                cancelledAt: null,
                cancelledReason: null,
                originalReservationId: null,
                isRecurring: true,
                recurringId: recurringReservation.id,
            };

            // Schedule class reminder jobs using new queue-based system
            try {
                const locationState = location.locationState;

                if (locationState?.planId && locationState.planId >= 2) {
                    await classQueue.add('recurring:reminder', {
                        recurringReservationId: recurringReservation.id,
                        locationId: lid,
                        reminderCount: 0,
                    }, {
                        jobId: `recurring-class-reminder-${recurringReservation.id}`,
                        attempts: 3,
                        backoff: { type: 'exponential', delay: 5000 }
                    });

                    console.log(`📧 Scheduled recurring class reminders for recurring reservation ${recurringReservation.id}`);
                }
            } catch (error) {
                console.error('Error scheduling class reminder jobs:', error);
                // Don't fail the reservation if job scheduling fails
            }

            const perfEnd = performance.now();
            console.log(`⏱️  [PERF] POST /reservations - Success: ${(perfEnd - perfStart).toFixed(2)}ms`);
            return status(200, { success: true, data: virtualReservation });
        } catch (err) {
            console.error(err);
            return status(500, { error: err });
        }
    }, ReservationsProps)
    app.delete('/:rid', async ({ params, query, status }) => {
        const { rid } = params;

        try {
            const [rrid, date] = rid.split("+");

            const rr = await db.query.recurringReservations.findFirst({
                where: (rr, { eq }) => eq(rr.id, rrid!)
            })

            if (!rr) {
                return status(404, { error: "Recurring reservation not found" })
            }

            await db.insert(reservationExceptions).values({
                recurringReservationId: rr.id,
                locationId: rr.locationId,
                sessionId: rr.sessionId,
                occurrenceDate: new Date(date!),
                initiator: 'member', // Member-initiated cancellation
            })

            // Remove queue jobs
            await removeQueueJobs(rid);

            return status(200, { success: true })
        } catch (error) {
            console.error(error)
            return status(500, { error: "Internal server error" })
        }
    }, {
        params: z.object({
            lid: z.string(),
            rid: z.string(),
        })
    })
    app.delete('/:rid/cancel', async ({ params, query, status }) => {
        const { rid } = params;
        try {
            const [rrid, date] = rid.split("+");

            await db.delete(recurringReservations).where(eq(recurringReservations.id, rrid!));
            await removeQueueJobs(rid);

            return status(200, { success: true })
        } catch (error) {
            console.error(error)
            return status(500, { error: "Internal server error" })
        }
    }, {
        params: z.object({
            lid: z.string(),
            rid: z.string(),
        }),
    })
    return app;
}



async function removeQueueJobs(rid: string) {
    // Cancel scheduled reminder emails for this specific occurrence
    // Note: For recurring reservations, we use the full rid (including date) for job IDs
    try {
        const classReminderJob = await classQueue.getJob(`reminder:${rid}`);
        const missedClassJob = await classQueue.getJob(`missed:${rid}`);

        await Promise.allSettled([
            classReminderJob?.remove(),
            missedClassJob?.remove()
        ]);

        console.log(`📧 Cancelled reminder emails for recurring reservation ${rid}`);
    } catch (error) {
        console.error('Error cancelling reminder emails:', error);
    }
}

