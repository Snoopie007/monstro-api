
import type { Elysia } from "elysia";
import { db } from "@/db/db";
import type { RecurringReservation, Reservation, MemberPackage, MemberSubscription } from "@/types";
import { recurringReservations, recurringReservationsExceptions, reservations } from "@/db/schemas";
import { isSessionPasted, getSessionState } from "@/libs/utils";
import { eq } from "drizzle-orm";
import { emailQueue } from "@/libs/queues";
import { format, subDays, addHours } from "date-fns";
import { MonstroData } from "@/libs/data";

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

            // Schedule class reminder emails (only for planId >= 2)
            try {
                const locationState = await db.query.locationState.findFirst({
                    where: (ls, { eq }) => eq(ls.locationId, lid)
                });

                if (locationState?.planId && locationState.planId >= 2) {
                    // Fetch member and location details
                    const member = await db.query.members.findFirst({
                        where: (m, { eq }) => eq(m.id, memberId)
                    });

                    const location = await db.query.locations.findFirst({
                        where: (l, { eq }) => eq(l.id, lid)
                    });

                    if (member && location && session.program) {
                        const startOn = reservation.startOn;
                        const endOn = reservation.endOn;
                        const now = new Date();
                        
                        // Format the day and time for display
                        const dayTime = format(startOn, "EEEE, MMMM d 'at' h:mm a");

                        // Calculate when to send emails
                        const upcomingReminderTime = subDays(startOn, 3);
                        const missedClassTime = addHours(endOn, 1);

                        const emailData = {
                            member: {
                                firstName: member.firstName || '',
                                lastName: member.lastName || '',
                            },
                            session: {
                                programName: session.program.name,
                                dayTime,
                            },
                            location: {
                                name: location.name || '',
                                address: location.address || '',
                            },
                            monstro: MonstroData,
                        };

                        // For missed class email validation
                        const missedClassEmailData = {
                            ...emailData,
                            session: {
                                ...emailData.session,
                                startTime: startOn.toISOString(),
                                endTime: endOn.toISOString(),
                                reservationId: reservation.isRecurring ? null : reservation.id,
                                recurringId: reservation.isRecurring ? reservation.recurringId : null,
                            },
                        };

                        // Calculate delays
                        const missedDelay = Math.max(0, missedClassTime.getTime() - Date.now());

                        // Schedule upcoming class reminder
                        if (startOn > now) {
                            // Class is in the future
                            let upcomingDelay: number;
                            
                            if (upcomingReminderTime > now) {
                                // Class is 3+ days away - schedule for 3 days before
                                upcomingDelay = upcomingReminderTime.getTime() - Date.now();
                                console.log(`📧 Scheduled upcoming class reminder for 3 days before ${dayTime}`);
                            } else {
                                // Class is < 3 days away - send immediately
                                upcomingDelay = 0;
                                console.log(`📧 Sending upcoming class reminder immediately (class is < 3 days away)`);
                            }

                            await emailQueue.add('send-email', {
                                to: member.email,
                                subject: `Reminder: ${session.program.name} class coming up`,
                                template: 'ClassReminderEmail',
                                metadata: emailData,
                            }, {
                                jobId: `class-reminder-${reservation.id}`,
                                delay: upcomingDelay,
                                attempts: 3,
                                backoff: { type: 'exponential', delay: 2000 },
                                removeOnComplete: { age: 60 * 60 * 24 * 7, count: 100 },
                            });
                        } else {
                            console.log(`⏭️ Skipping upcoming reminder - class is in the past`);
                        }

                        // Schedule missed class email (1 hour after class ends)
                        await emailQueue.add('send-email', {
                            to: member.email,
                            subject: `We missed you at ${session.program.name}`,
                            template: 'MissedClassEmail',
                            metadata: missedClassEmailData,
                        }, {
                            jobId: `missed-class-${reservation.id}`,
                            delay: missedDelay,
                            attempts: 3,
                            backoff: { type: 'exponential', delay: 2000 },
                            removeOnComplete: { age: 60 * 60 * 24 * 7, count: 100 },
                        });

                        console.log(`📧 Scheduled class reminder emails for reservation ${reservation.id}`);
                    }
                }
            } catch (error) {
                console.error('Error scheduling class reminder emails:', error);
                // Don't fail the reservation if email scheduling fails
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