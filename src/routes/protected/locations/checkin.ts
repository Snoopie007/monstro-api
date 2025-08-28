import { db } from "@/db/db";
import { attendances, memberPackages } from "@/db/schemas";
import type { Reservation } from "@/types/attendance";
import { isSameHour } from "date-fns";
import Elysia from "elysia";
import { eq } from "drizzle-orm";


type CheckinBody = {
    reservationId: string;
    isRecurring: boolean;
    recurringId: string;
    startOn: Date;
    endOn: Date;
    memberSubscriptionId: string;
    memberPackageId: string;
}

export async function locationCheckin(app: Elysia) {
    return app.post('/checkin', async ({ body, status }) => {
        const { reservationId, isRecurring, recurringId, startOn, endOn, ...rest } = body as CheckinBody;

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

            const checkin = await db.insert(attendances).values({
                reservationId: !reservation.isRecurring ? reservation.id : null,
                recurringId: reservation.isRecurring ? reservation.recurringId : null,
                checkInTime: new Date(),
                startTime: startOn,
                endTime: endOn,
            });

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

            return status(200, checkin);
        } catch (err) {
            console.log(err);
            return status(500, { error: err });
        }
    })
}