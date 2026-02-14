import { Elysia, t } from "elysia";
import { db } from "@/db/db";
import type {
    Reservation, MemberPackage,
    MemberSubscription,
} from "subtrees/types";
import {
    memberPackages, memberSubscriptions,
    reservations
} from "subtrees/schemas";
import { eq, sql, and, gte, lte } from "drizzle-orm";
import { classQueue } from "@/queues";

import { addHours, addMinutes, differenceInMilliseconds, subDays } from "date-fns";
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { checkClassLimit, getSessionState } from "./utils";

const ReservationsProps = {
    params: t.Object({
        lid: t.String(),
    }),
    body: t.Object({
        memberPlanId: t.String(),
        session: t.Object({
            id: t.String(),
            programId: t.String(),
            utcStartTime: t.Date(),
            utcEndTime: t.Date(),
        }),
        autoReschedule: t.Optional(t.Boolean()),
    }),
};
export async function locationReservations(app: Elysia) {
    app.group('/reservations', (app) => {
        app.post('/', async ({ body, params, status }) => {
            const { lid } = params;
            const { memberPlanId, session, autoReschedule } = body;
            const isPackage = memberPlanId.startsWith("pkg_");
            try {

                let pkg = undefined;
                let sub = undefined;
                if (isPackage) {
                    pkg = await db.query.memberPackages.findFirst({
                        where: (memberPackages, { eq, and }) => and(
                            eq(memberPackages.id, memberPlanId),
                            eq(memberPackages.status, "active")
                        ),
                        columns: {
                            id: true,
                            memberId: true,
                            memberPlanPricingId: true,
                            totalClassLimit: true,
                            totalClassAttended: true,
                        }
                    });

                } else {
                    sub = await db.query.memberSubscriptions.findFirst({
                        where: (memberSubscriptions, { eq, and }) => and(
                            eq(memberSubscriptions.id, memberPlanId),
                            eq(memberSubscriptions.status, "active")
                        ),
                        columns: {
                            id: true,
                            memberPlanPricingId: true,
                            memberId: true,
                            classCredits: true,
                        },
                        with: {
                            pricing: {
                                columns: {
                                    id: true,
                                },
                                with: {
                                    plan: {
                                        columns: {
                                            id: true,
                                            classLimitInterval: true,
                                            totalClassLimit: true,
                                        },
                                    },
                                },
                            },
                        },
                    });
                }
                const location = await db.query.locations.findFirst({
                    where: (locations, { eq }) => eq(locations.id, lid),
                    columns: {
                        id: true,
                        timezone: true,
                    },
                });

                if (!location) {
                    throw new Error("Location not found");
                }
                const now = toZonedTime(new Date(), location.timezone);


                if (!pkg && !sub) {
                    throw new Error("Member plan not found");
                }

                let memberId = pkg?.memberId ?? sub?.memberId;



                const reachedClassLimit = await checkClassLimit({ pkg, sub, now });
                if (reachedClassLimit) {
                    return status(200, { success: false, message: "Class limit reached for your plan." });
                }
                // location time

                const { utcStartTime, utcEndTime, programId } = session;

                // Check if session is in the past
                const diff = differenceInMilliseconds(utcStartTime, now);

                if (diff <= 15) {
                    return status(200, { success: false, message: "This session is in the future." });
                }

                // Check session state
                const { isFull, isReserved } = await getSessionState({
                    startTime: utcStartTime,
                    sessionId: session.id,
                    programId: programId,
                    memberId: memberId!,
                });
                if (isFull || isReserved) {
                    const error = isReserved ? "Session is already reserved" : "Session is full";
                    return status(200, { success: false, message: error });
                }



                const reservation = await db.transaction(async (tx) => {
                    // Explicitly cast to Reservation[] (or whatever Drizzle returns)
                    const inserted = await tx.insert(reservations).values({
                        memberId: memberId!,
                        locationId: lid,
                        sessionId: session.id,
                        startOn: utcStartTime,
                        endOn: utcEndTime,
                        ...session,
                        ...(isPackage ? {
                            memberPackageId: pkg?.id,
                        } : {
                            memberSubscriptionId: sub?.id,
                        })
                    }).returning();

                    // Cast result to Reservation so reservation.id exists
                    const res = inserted[0] as Reservation | undefined;
                    if (!res) {
                        await tx.rollback();
                        throw new Error("Failed to create reservation");
                    }
                    if (pkg) {
                        await tx.update(memberPackages).set({
                            totalClassAttended: Math.max((pkg?.totalClassAttended || 0) + 1, 0)
                        }).where(eq(memberPackages.id, pkg?.id!));
                    }
                    if (sub) {
                        const plan = sub.pricing?.plan;
                        if (plan?.classLimitInterval === 'term') {
                            await tx.update(memberSubscriptions).set({
                                classCredits: Math.max((sub.classCredits || 0) - 1, 0)
                            }).where(eq(memberSubscriptions.id, memberPlanId));
                        }
                    }
                    return res;
                });


                // Schedule class reminder jobs using new queue-based system
                try {
                    const payload = {
                        rid: reservation.id,
                        lid,
                        mid: memberId,
                    }
                    // Calculate delays for reminders and missed checks

                    const reminderDelay = differenceInMilliseconds(subDays(session.utcStartTime, 2), now);
                    const missedDelay = differenceInMilliseconds(addMinutes(session.utcEndTime, 45), now);
                    let queues = [
                        classQueue.add('reminder', payload, {
                            jobId: `class:reminder:${reservation.id}`,
                            attempts: 3,
                            delay: reminderDelay,
                        }),

                        classQueue.add('missed:check', payload, {
                            jobId: `class:missed:${reservation.id}`,
                            attempts: 3,
                            delay: missedDelay,
                        })
                    ]

                    if (autoReschedule) {
                        const rescheduleDelay = differenceInMilliseconds(subDays(session.utcStartTime, 1), now);
                        queues.push(
                            classQueue.add('reschedule', payload, {
                                jobId: `class:reschedule:${reservation.id}`,
                                attempts: 3,
                                delay: rescheduleDelay,
                            })
                        )
                    }

                    await Promise.all(queues)
                } catch (error) {
                    console.error('Error scheduling class reminder jobs:', error);
                    // Don't fail the reservation if job scheduling fails
                }


                return status(200, { success: true, data: reservation });
            } catch (err) {
                console.error(err);
                return status(500, { error: err });
            }
        }, ReservationsProps)
        app.delete('/:rid', async ({ params, status }) => {
            const { rid } = params;
            try {
                const reservation = await db.query.reservations.findFirst({
                    where: (reservations, { eq }) => eq(reservations.id, rid),

                })

                if (!reservation) {
                    return status(404, { error: "Reservation not found" })
                }


                await db.transaction(async (tx) => {
                    await tx.delete(reservations).where(eq(reservations.id, reservation.id))
                    if (reservation.memberPackageId) {
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
                        const sub = await tx.query.memberSubscriptions.findFirst({

                            where: (memberSubscriptions, { eq }) => eq(memberSubscriptions.id, reservation.memberSubscriptionId!),
                            with: {
                                pricing: {
                                    columns: {
                                        id: true,
                                    },
                                    with: {
                                        plan: {
                                            columns: {
                                                id: true,
                                                classLimitInterval: true,
                                                totalClassLimit: true,
                                            },
                                        },
                                    },
                                },
                            },
                        })
                        if (!sub) {
                            throw new Error("Member subscription not found");
                        }
                        const { pricing } = sub;

                        if (pricing.plan && pricing.plan.classLimitInterval) {
                            const limit = pricing.plan.totalClassLimit;

                            if (pricing.plan.classLimitInterval === 'term' && limit && limit > 0) {
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



                return status(200, { success: true })
            } catch (error) {
                console.error(error)
                return status(500, { error: "Internal server error" })
            }
        }, {
            params: t.Object({
                lid: t.String(),
                rid: t.String(),
            })
        })

        return app;
    })



    return app;
}





