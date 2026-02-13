import { classQueue } from "@/queues";
import { db } from "@/db/db";
import type Elysia from "elysia";

type ScheduleMissedClassCheckBody = {
    reservationId: string;
    locationId: string;
}

type CancelMissedClassCheckParams = {
    reservationId: string;
}

export async function missedClassCheckRoutes(app: Elysia) {
    return app.post('/missed', async ({ body, params, status }) => {
        const { reservationId, locationId } = body as ScheduleMissedClassCheckBody;
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

            const jobId = `missed:${reservationId}`;
            const duration = reservation.sessionDuration ?? Math.max(
                1,
                Math.round((reservation.endOn.getTime() - reservation.startOn.getTime()) / 60000)
            );

            // Job will fetch data and determine check timing
            await classQueue.add('missed', {
                reservationId,
                locationId,
                memberId: reservation.member.id,
                data: {
                    member: {
                        firstName: reservation.member.firstName,
                        lastName: reservation.member.lastName,
                        email: reservation.member.email,
                    },
                    location: {
                        name: reservation.location.name,
                        email: reservation.location.email,
                        phone: reservation.location.phone,
                        address: reservation.location.address,
                    },
                    class: {
                        name: reservation.programName || 'Scheduled Class',
                        startTime: reservation.startOn,
                        endTime: reservation.endOn,
                        duration,
                        instructor: reservation.staff ? {
                            firstName: reservation.staff.firstName,
                            lastName: reservation.staff.lastName,
                        } : null,
                    },
                },
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
                message: `Missed class check scheduled for reservation ${reservationId}`,
                jobId
            };
        } catch (error) {
            console.error('Error scheduling missed class check:', error);
            throw new Error(`Failed to schedule: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    })
        .delete('/missed/:reservationId', async ({ params }: { params: CancelMissedClassCheckParams }) => {
            const { reservationId } = params;

            try {
                const jobId = `missed:${reservationId}`;
                const job = await classQueue.getJob(jobId);

                if (job) {
                    await job.remove();
                    return {
                        success: true,
                        message: `Cancelled missed class check for reservation ${reservationId}`
                    };
                }

                return {
                    success: false,
                    message: `No missed class check found for reservation ${reservationId}`
                };
            } catch (error) {
                console.error('Error cancelling missed class check:', error);
                throw new Error(`Failed to cancel: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
}
