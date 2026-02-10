import { classQueue } from "@/workers/queues";
import { db } from "@/db/db";
import type Elysia from "elysia";

type ScheduleClassReminderBody = {
    reservationId: string;
    locationId: string;
}

type CancelClassReminderParams = {
    reservationId: string;
}

export async function classReminderRoutes(app: Elysia) {
    return app.post('/reminder', async ({ body, params, status }) => {
        const { reservationId, locationId } = body as ScheduleClassReminderBody;
        const { lid } = params as { lid: string };

        try {
            if (locationId !== lid) {
                return status(400, {
                    success: false,
                    message: `locationId in body (${locationId}) does not match route lid (${lid})`
                });
            }

            const reservation = await db.query.reservations.findFirst({
                where: (r, { and, eq }) => and(
                    eq(r.id, reservationId),
                    eq(r.locationId, locationId),
                ),
                with: {
                    member: true,
                    location: true,
                    staff: true,
                },
            });

            if (!reservation) {
                return status(404, {
                    success: false,
                    message: `Reservation ${reservationId} not found for location ${locationId}`,
                });
            }

            if (!reservation.member || !reservation.location) {
                return status(422, {
                    success: false,
                    message: `Reservation ${reservationId} is missing member/location context`,
                });
            }

            const jobId = `class:reminder:${reservationId}`;
            const duration = reservation.sessionDuration ?? Math.max(
                1,
                Math.round((reservation.endOn.getTime() - reservation.startOn.getTime()) / 60000)
            );
            const member = {
                firstName: reservation.member.firstName,
                lastName: reservation.member.lastName,
                email: reservation.member.email,
            };
            const location = {
                name: reservation.location.name,
                email: reservation.location.email,
                phone: reservation.location.phone,
                address: reservation.location.address,
            };
            const classData = {
                name: reservation.programName || 'Scheduled Class',
                startTime: reservation.startOn,
                endTime: reservation.endOn,
                duration,
                instructor: reservation.staff ? {
                    firstName: reservation.staff.firstName,
                    lastName: reservation.staff.lastName,
                } : null,
            };

            // Job will fetch reservation data and calculate timing
            await classQueue.add('reminder', {
                reservationId,
                locationId,
                member,
                location,
                class: classData,
            }, {
                jobId,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000
                }
            });

            return {
                success: true,
                message: `Class reminder scheduled for reservation ${reservationId}`,
                jobId
            };
        } catch (error) {
            console.error('Error scheduling class reminder:', error);
            throw new Error(`Failed to schedule: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    })
        .delete('/reminder/:reservationId', async ({ params }: { params: CancelClassReminderParams }) => {
            const { reservationId } = params;

            try {
                const jobId = `class:reminder:${reservationId}`;
                const job = await classQueue.getJob(jobId);

                if (job) {
                    await job.remove();
                    return {
                        success: true,
                        message: `Cancelled class reminder for reservation ${reservationId}`
                    };
                }

                return {
                    success: false,
                    message: `No reminder job found for reservation ${reservationId}`
                };
            } catch (error) {
                console.error('Error cancelling class reminder:', error);
                throw new Error(`Failed to cancel: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
}
