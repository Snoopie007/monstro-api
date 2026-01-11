
import type { Elysia } from "elysia";
import { db } from "@/db/db";
import type {
    RecurringReservation, Reservation, MemberPackage,
    MemberSubscription, ProgramSession
} from "@/types";
import {
    memberPackages, memberSubscriptions,
    recurringReservations, reservationExceptions,
    reservations
} from "@/db/schemas";
import { eq, sql } from "drizzle-orm";
import { emailQueue, classQueue } from "@/libs/queues";
import { z } from "zod";
import { addMinutes, startOfWeek, endOfWeek } from "date-fns";
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { getMemberPlan, getSessionState, checkClassLimit } from "./utils";
import { recurringReservationRoutes } from "./recurring";

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
        }),
    }),
};
export async function locationReservations(app: Elysia) {
    app.group('/reservations', (app) => {
        app.post('/', async ({ body, params, status }) => {
            const perfStart = performance.now();
            const { lid } = params;
            const { memberPlanId, date, session } = body;

            const isPackage = memberPlanId.startsWith("pkg_");
            try {

                const perfMemberPlan = performance.now();
                console.log(`⏱️  [PERF] Member plan query: ${(perfMemberPlan - perfStart).toFixed(2)}ms`);
                const memberPlan = await getMemberPlan(memberPlanId);
                const location = memberPlan.location;
                const memberId = memberPlan.memberId;
                const now = toZonedTime(new Date(), location!.timezone);

                if (!location) {
                    throw new Error("Location not found");
                }

                const reachedClassLimit = await checkClassLimit({ isPackage, memberPlan, now });
                if (reachedClassLimit) {
                    return status(200, { success: false, message: `Class limit reached for your plan.` });
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



                const reservation = await db.transaction(async (tx) => {
                    // Explicitly cast to Reservation[] (or whatever Drizzle returns)
                    const inserted = await tx.insert(reservations).values({
                        memberId,
                        locationId: lid,
                        sessionId: session.id,
                        startOn: startTime,
                        endOn: endTime,
                        ...session,
                        ...(isPackage ? {
                            memberPackageId: memberPlan.id,
                        } : {
                            memberSubscriptionId: memberPlan.id,
                        })
                    }).returning();

                    // Cast result to Reservation so reservation.id exists
                    const res = inserted[0] as Reservation | undefined;
                    if (!res) {
                        await tx.rollback();
                        throw new Error("Failed to create reservation");
                    }
                    if (isPackage) {
                        const pkg = memberPlan as MemberPackage;
                        await tx.update(memberPackages).set({
                            totalClassAttended: Math.max((pkg.totalClassAttended || 0) + 1, 0)
                        }).where(eq(memberPackages.id, memberPlan.id));
                    } else {
                        const sub = memberPlan as MemberSubscription;
                        if (sub.plan?.classLimitInterval === 'term') {
                            await tx.update(memberSubscriptions).set({
                                classCredits: Math.max((sub.classCredits || 0) - 1, 0)
                            }).where(eq(memberSubscriptions.id, memberPlan.id));
                        }
                    }
                    return res;
                });


                // Schedule class reminder jobs using new queue-based system
                try {
                    const locationState = location.locationState;
                    const ids = {
                        reservationId: reservation.id,
                        locationId: lid,
                    }
                    if (locationState?.planId && locationState.planId >= 2) {
                        // Single reservation - schedule class reminder and missed check
                        await classQueue.add('send-class-reminder', ids, {
                            jobId: `class-reminder-${reservation.id}`,
                            attempts: 3,
                            backoff: { type: 'exponential', delay: 5000 }
                        });

                        await classQueue.add('check-missed-class', ids, {
                            jobId: `missed-class-${reservation.id}`,
                            attempts: 3,
                            backoff: { type: 'exponential', delay: 5000 }
                        });

                        console.log(`📧 Scheduled class reminders for reservation ${reservation.id}`);
                    }
                } catch (error) {
                    console.error('Error scheduling class reminder jobs:', error);
                    // Don't fail the reservation if job scheduling fails
                }

                const perfEnd = performance.now();
                console.log(`⏱️  [PERF] POST /reservations - Success: ${(perfEnd - perfStart).toFixed(2)}ms`);
                return status(200, { success: true, data: reservation });
            } catch (err) {
                console.error(err);
                return status(500, { error: err });
            }
        }, ReservationsProps)
        app.delete('/:rid', async ({ params, status }) => {
            const { rid } = params;
            console.log('rid', rid);
            try {
                const reservation = await db.query.reservations.findFirst({
                    where: (reservations, { eq }) => eq(reservations.id, rid),
                    with: {
                        memberPackage: {
                            with: {
                                pricing: {
                                    with: {
                                        plan: true,
                                    },
                                },
                            },
                        },
                        memberSubscription: {
                            with: {
                                pricing: {
                                    with: {
                                        plan: true,
                                    },
                                },
                            },
                        },
                    }
                })

                if (!reservation) {
                    return status(404, { error: "Reservation not found" })
                }


                await db.transaction(async (tx) => {
                    await tx.delete(reservations).where(eq(reservations.id, reservation.id))
                    if (reservation.memberPackage) {
                        // Prevent decrementing below 0
                        await tx.execute(sql`
                            UPDATE ${memberPackages}
                            SET total_class_attended = CASE 
                                WHEN total_class_attended > 0 THEN total_class_attended - 1
                                ELSE 0
                            END
                            WHERE id = ${reservation.memberPackageId!}
                        `);
                    } else {
                        const plan = reservation.memberSubscription?.pricing?.plan;

                        if (plan && plan.classLimitInterval) {
                            const limit = plan.totalClassLimit;

                            if (plan.classLimitInterval === 'term' && limit && limit > 0) {
                                // Make sure not to exceed the original classCredits limit
                                await tx.execute(sql` UPDATE ${memberSubscriptions}
                                    SET class_credits = 
                                        CASE 
                                            WHEN class_credits < ${limit} THEN class_credits + 1
                                            ELSE class_credits
                                        END
                                    WHERE id = ${reservation.memberSubscriptionId!}
                                `);
                            }
                        }

                    }
                });

                // Cancel scheduled reminder emails
                // try {
                //     const classReminderJob = await emailQueue.getJob(`class-reminder-${rid}`);
                //     const missedClassJob = await emailQueue.getJob(`missed-class-${rid}`);

                //     await Promise.allSettled([
                //         classReminderJob?.remove(),
                //         missedClassJob?.remove()
                //     ]);

                //     console.log(`📧 Cancelled reminder emails for reservation ${rid}`);
                // } catch (error) {
                //     console.error('Error cancelling reminder emails:', error);
                // }


                // } else {


                //     const [rrid, date] = rid.split("+");

                //     const rr = await db.query.recurringReservations.findFirst({
                //         where: (rr, { eq }) => eq(rr.id, rrid!)
                //     })



                //     if (!rr) {
                //         return status(404, { error: "Recurring reservation not found" })
                //     }


                //     await db.insert(reservationExceptions).values({
                //         recurringReservationId: rr.id,
                //         locationId: rr.locationId,
                //         sessionId: rr.sessionId,
                //         occurrenceDate: new Date(date!),
                //         initiator: 'member', // Member-initiated cancellation
                //     })
                //     sid = rr.sessionId;

                //     // Cancel scheduled reminder emails for this specific occurrence
                //     // Note: For recurring reservations, we use the full rid (including date) for job IDs
                //     try {
                //         const classReminderJob = await emailQueue.getJob(`class-reminder-${rid}`);
                //         const missedClassJob = await emailQueue.getJob(`missed-class-${rid}`);

                //         await Promise.allSettled([
                //             classReminderJob?.remove(),
                //             missedClassJob?.remove()
                //         ]);

                //         console.log(`📧 Cancelled reminder emails for recurring reservation ${rid}`);
                //     } catch (error) {
                //         console.error('Error cancelling reminder emails:', error);
                //     }
                // }


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

        return app;
    })

    app.group('/recurring', (app) => {
        app.use(recurringReservationRoutes)
        return app;
    })

    return app;
}





