
import type { Elysia } from "elysia";
import { db } from "@/db/db";
import type { RecurringReservation, Reservation, MemberPackage, MemberSubscription } from "@/types";
import { recurringReservations, recurringReservationsExceptions, reservations } from "@/db/schemas";
import { isSessionPasted, getSessionState } from "@/libs/utils";
import { eq } from "drizzle-orm";
import { emailQueue, classQueue } from "@/libs/queues";

type ReservationBody = {
    type: "pkg" | "sub";
    planId: string;
    sessionId: string;
    date: string;
    memberId: string;
    recurring: boolean;
    interval: "day" | "week" | "month" | "year";
    intervalThreshold: number;
}

export async function locationReservations(app: Elysia) {
    return app.post('/reservations', async ({ body, params, status }) => {
        const { type, planId, sessionId, date, memberId, ...rest } = body as ReservationBody;
        const { lid } = params as { lid: string }

        try {
            let memberPlan: MemberPackage | MemberSubscription | undefined;
            if (type === "pkg") {
                memberPlan = await db.query.memberPackages.findFirst({
                    where: (memberPackages, { eq, and }) => and(
                        eq(memberPackages.memberId, memberId),
                        eq(memberPackages.id, planId),
                        eq(memberPackages.status, "active")
                    ),
                    with: {
                        plan: true,
                    },
                });
            } else {
                memberPlan = await db.query.memberSubscriptions.findFirst({
                    where: (memberSubscriptions, { eq, and }) => and(
                        eq(memberSubscriptions.memberId, memberId),
                        eq(memberSubscriptions.id, planId),
                        eq(memberSubscriptions.status, "active")
                    ),
                    with: {
                        plan: true,
                    },
                });
            }

            if (!memberPlan) {
                return status(404, { error: "Member plan not found" });
            }

            const session = await db.query.programSessions.findFirst({
                where: (programSessions, { eq }) => eq(programSessions.id, sessionId),
                with: {
                    program: true,
                    reservations: {
                        where: (reservations, { eq }) =>
                            eq(reservations.startOn, new Date(date)),
                    },
                    recurringReservations: {
                        where: (recurringReservations, { lte, isNull, and }) =>
                            and(
                                lte(recurringReservations.startDate, new Date(date)),
                                isNull(recurringReservations.canceledOn)
                            ),
                        with: {
                            exceptions: {
                                where: (exceptions, { eq }) =>
                                    eq(exceptions.occurrenceDate, new Date(date)),
                            },
                        },
                    },
                },
            });

            if (!session) {
                return status(404, { error: "Session not found" });
            }

            // Create a properly typed session object for the utility functions
            const sessionWithTimes = {
                ...session,
                startTime: new Date(`${new Date(date).toDateString()} ${session.time}`),
                endDate: new Date(
                    new Date(`${new Date(date).toDateString()} ${session.time}`).getTime() +
                    session.duration * 60000
                ),
            };

            const isPasted = isSessionPasted(sessionWithTimes, new Date(date));
            if (isPasted) {
                return status(400, { error: "Session is in the past" });
            }

            const sessionState = getSessionState(sessionWithTimes, memberId);

            if (sessionState.isFull || sessionState.isReserved) {
                const error = sessionState.isReserved
                    ? "Session is already reserved"
                    : "Session is full";
                return status(400, { error });
            }

            let reservation: Reservation;
            if (!rest.recurring) {
                // Calculate endOn time based on session duration
                const startOn = new Date(date);
                const endOn = new Date(startOn.getTime() + session.duration * 60000);

                const [r] = await db.insert(reservations).values({
                    memberId,
                    locationId: lid,
                    sessionId: sessionId,
                    startOn: startOn,
                    endOn: endOn,
                    ...(type === "pkg") ? {
                        memberPackageId: memberPlan.id,
                    } : {
                        memberSubscriptionId: memberPlan.id,
                    }
                }).returning();
                reservation = r as Reservation;
            } else {
                const [rr] = await db.insert(recurringReservations).values({
                    memberId,
                    locationId: lid,
                    sessionId: sessionId,
                    startDate: new Date(),
                    ...(type === "pkg") ? {
                        memberPackageId: memberPlan.id,
                    } : {
                        memberSubscriptionId: memberPlan.id,
                    },
                    interval: rest.interval || "week",
                    intervalThreshold: rest.intervalThreshold || 1,
                }).returning();
                if (!rr) {
                    return status(500, { error: "Failed to create recurring reservation" });
                }
                const { id, startDate, ...rrRest } = rr as RecurringReservation;
                const startOn = new Date(date);
                const endOn = new Date(startOn.getTime() + session.duration * 60000);

                reservation = {
                    ...rrRest,
                    id,
                    sessionId: sessionId,
                    startOn: startOn,
                    endOn: endOn,
                    isRecurring: true,
                    recurringId: id,
                } as Reservation;
            }

            // Schedule class reminder jobs using new queue-based system
            try {
                const locationState = await db.query.locationState.findFirst({
                    where: (ls, { eq }) => eq(ls.locationId, lid)
                });

                if (locationState?.planId && locationState.planId >= 2) {
                    if (!rest.recurring) {
                        // Single reservation - schedule class reminder and missed check
                        await classQueue.add('send-class-reminder', {
                            reservationId: reservation.id,
                            locationId: lid,
                        }, {
                            jobId: `class-reminder-${reservation.id}`,
                            attempts: 3,
                            backoff: { type: 'exponential', delay: 5000 }
                        });

                        await classQueue.add('check-missed-class', {
                            reservationId: reservation.id,
                            locationId: lid,
                        }, {
                            jobId: `missed-class-${reservation.id}`,
                            attempts: 3,
                            backoff: { type: 'exponential', delay: 5000 }
                        });

                        console.log(`📧 Scheduled class reminders for reservation ${reservation.id}`);
                    } else {
                        // Recurring reservation - schedule recurring reminder job
                        await classQueue.add('process-recurring-class-reminder', {
                            recurringReservationId: reservation.recurringId,
                            locationId: lid,
                            reminderCount: 0,
                        }, {
                            jobId: `recurring-class-reminder-${reservation.recurringId}`,
                            attempts: 3,
                            backoff: { type: 'exponential', delay: 5000 }
                        });

                        console.log(`📧 Scheduled recurring class reminders for recurring reservation ${reservation.recurringId}`);
                    }
                }
            } catch (error) {
                console.error('Error scheduling class reminder jobs:', error);
                // Don't fail the reservation if job scheduling fails
            }

            return status(200, reservation);
        } catch (err) {
            console.error(err);
            return status(500, { error: err });
        }
    }).delete('/reservations/:rid', async ({ params, status }) => {
        const { rid } = params as { rid: string }

        try {

            let sid: string | null = null;
            if (rid.startsWith("rsv_")) {

                const reservation = await db.query.reservations.findFirst({
                    where: (reservations, { eq }) => eq(reservations.id, rid)
                })

                if (!reservation) {
                    return status(404, { error: "Reservation not found" })
                }
                await db.delete(reservations).where(eq(reservations.id, reservation.id))
                sid = reservation.sessionId;

                // Cancel scheduled reminder emails
                try {
                    const classReminderJob = await emailQueue.getJob(`class-reminder-${rid}`);
                    const missedClassJob = await emailQueue.getJob(`missed-class-${rid}`);
                    
                    await Promise.allSettled([
                        classReminderJob?.remove(),
                        missedClassJob?.remove()
                    ]);

                    console.log(`📧 Cancelled reminder emails for reservation ${rid}`);
                } catch (error) {
                    console.error('Error cancelling reminder emails:', error);
                }
            } else {


                const [rrid, date] = rid.split("+");

                const rr = await db.query.recurringReservations.findFirst({
                    where: (rr, { eq }) => eq(rr.id, rrid!)
                })



                if (!rr) {
                    return status(404, { error: "Recurring reservation not found" })
                }


                await db.insert(recurringReservationsExceptions).values({
                    recurringReservationId: rr.id,
                    occurrenceDate: new Date(date!)
                })
                sid = rr.sessionId;

                // Cancel scheduled reminder emails for this specific occurrence
                // Note: For recurring reservations, we use the full rid (including date) for job IDs
                try {
                    const classReminderJob = await emailQueue.getJob(`class-reminder-${rid}`);
                    const missedClassJob = await emailQueue.getJob(`missed-class-${rid}`);
                    
                    await Promise.allSettled([
                        classReminderJob?.remove(),
                        missedClassJob?.remove()
                    ]);

                    console.log(`📧 Cancelled reminder emails for recurring reservation ${rid}`);
                } catch (error) {
                    console.error('Error cancelling reminder emails:', error);
                }
            }


            return status(200, { sid })
        } catch (error) {
            console.error(error)
            return status(500, { error: "Internal server error" })
        }
    })
}   