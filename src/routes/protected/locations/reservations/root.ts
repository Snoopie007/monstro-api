import { Elysia, t } from "elysia";
import { db } from "@/db/db";
import type {
    Reservation
} from "subtrees/types";
import {
    memberPackages, memberSubscriptions,
    reservations
} from "subtrees/schemas";
import { eq, sql } from "drizzle-orm";

import { differenceInMilliseconds } from "date-fns";
import { toZonedTime } from 'date-fns-tz';
import { checkSubClassCredits, getSessionState, scheduleClassReminderJobs } from "./utils";
import { chargeWallet } from "@/libs/wallet";

const ReservationsProps = {
    params: t.Object({
        lid: t.String(),
    }),
    body: t.Object({
        plan: t.Object({
            id: t.String(),
            classLimitInterval: t.Union([t.Literal("week"), t.Literal("term"), t.Literal("one"), t.Null()]),
            totalClassLimit: t.Union([t.Number(), t.Null()]),
        }),
        session: t.Object({
            id: t.String(),
            capacity: t.Optional(t.Union([t.Number(), t.Null()])),
            programName: t.String(),
            programId: t.String(),
            utcStartTime: t.Date(),
            utcEndTime: t.Date(),
            staffId: t.Optional(t.Union([t.String(), t.Null()])),
        }),
        memberPlanId: t.String(),
        autoReschedule: t.Optional(t.Boolean()),
    }),
};
export async function locationReservations(app: Elysia) {
    app.group('/reservations', (app) => {
        app.post('/', async ({ body, params, status }) => {
            const { lid } = params;
            const { memberPlanId, session, autoReschedule, plan } = body;
            const isPackage = memberPlanId.startsWith("pkg_");
            try {

                const location = await db.query.locations.findFirst({
                    where: (locations, { eq }) => eq(locations.id, lid),
                    columns: {
                        id: true,
                        vendorId: true,
                        name: true,
                        email: true,
                        phone: true,
                        timezone: true,
                    }
                });

                if (!location) {
                    throw new Error("Location not found");
                }

                let pkg = undefined;
                let sub = undefined;
                let classLimitReached = false;
                let member = undefined;
                if (isPackage) {
                    pkg = await db.query.memberPackages.findFirst({
                        where: (mp, { eq, and }) => and(
                            eq(mp.id, memberPlanId),
                            eq(mp.status, "active")
                        ),
                        with: {
                            member: {
                                columns: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                },
                            },
                        },
                        columns: {
                            totalClassLimit: true,
                            totalClassAttended: true,
                        }
                    });
                    member = pkg?.member;
                    classLimitReached = pkg ? pkg.totalClassAttended >= pkg.totalClassLimit : false;
                } else {
                    sub = await db.query.memberSubscriptions.findFirst({
                        where: (ms, { eq, and }) => and(
                            eq(ms.id, memberPlanId),
                            eq(ms.status, "active")
                        ),
                        with: {
                            member: {
                                columns: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                },
                            },
                        },
                        columns: {
                            id: true,
                            classCredits: true,
                        },
                    });

                    if (plan.classLimitInterval === 'term' && sub?.classCredits === 0) {
                        return status(200, { success: false, message: "No credits available for your plan." });
                    }
                    member = sub?.member;
                    classLimitReached = sub ? await checkSubClassCredits({
                        sid: sub.id,
                        mid: member?.id,
                        classLimitInterval: plan.classLimitInterval,
                        totalClassLimit: plan.totalClassLimit
                    }) : false;
                }

                if (!pkg && !sub) {
                    throw new Error("Member plan not found");
                }

                if (!member) {
                    throw new Error("Member not found");
                }

                if (classLimitReached) {
                    return status(200, { success: false, message: "Class limit reached for your plan." });
                }

                // location time
                const now = toZonedTime(new Date(), location.timezone);
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
                    memberId: member.id,
                    capacity: session.capacity ?? 0,
                });


                if (isFull || isReserved) {
                    const error = isReserved ? "Session is already reserved" : "Session is full";
                    return status(200, { success: false, message: error });
                }

                const reservation = await db.transaction(async (tx) => {
                    // Explicitly cast to Reservation[] (or whatever Drizzle returns)
                    const inserted = await tx.insert(reservations).values({
                        memberId: member.id,
                        locationId: lid,
                        programName: session.programName,
                        sessionId: session.id,
                        startOn: utcStartTime,
                        endOn: utcEndTime,
                        programId: programId,
                        ...(isPackage ? {
                            memberPackageId: memberPlanId,
                        } : {
                            memberSubscriptionId: memberPlanId,
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
                        }).where(eq(memberPackages.id, memberPlanId));
                    }
                    if (sub) {

                        if (plan.classLimitInterval === 'term') {
                            await tx.update(memberSubscriptions).set({
                                classCredits: Math.max((sub.classCredits || 0) - 1, 0)
                            }).where(eq(memberSubscriptions.id, memberPlanId));
                        }
                    }
                    return res;
                });
                const success = await chargeWallet({
                    lid,
                    vendorId: location.vendorId,
                    amount: autoReschedule ? 1000 : 1500,
                    description: `Automation fee for ${session.programName}`,
                });

                if (success) {
                    await scheduleClassReminderJobs({
                        lid,
                        reservationId: reservation.id,
                        memberPlanId,
                        member,
                        location,
                        session,
                        plan,
                        autoReschedule: autoReschedule ?? false,
                    });
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







