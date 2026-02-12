import { classQueue } from "@/queues";
import { db } from "@/db/db";
import type Elysia from "elysia";

type ScheduleRecurringClassReminderBody = {
    recurringReservationId: string;
    locationId: string;
}

type CancelRecurringClassReminderParams = {
    recurringReservationId: string;
}

export async function recurringClassReminderRoutes(app: Elysia) {
    return app.post('/recurring', async ({ body, params, status }) => {
        const { recurringReservationId, locationId } = body as ScheduleRecurringClassReminderBody;
        const { lid } = params as { lid: string };

        try {
            if (locationId !== lid) {
                return status(400, {
                    success: false,
                    message: `locationId in body (${locationId}) does not match route lid (${lid})`
                });
            }

            const recurringReservation = await db.query.recurringReservations.findFirst({
                where: (rr, { and, eq }) => and(
                    eq(rr.id, recurringReservationId),
                    eq(rr.locationId, locationId),
                ),
                with: {
                    member: true,
                    location: true,
                    staff: true,
                },
            });

            if (!recurringReservation) {
                return status(404, {
                    success: false,
                    message: `Recurring reservation ${recurringReservationId} not found for location ${locationId}`,
                });
            }

            if (!recurringReservation.member || !recurringReservation.location) {
                return status(422, {
                    success: false,
                    message: `Recurring reservation ${recurringReservationId} is missing member/location context`,
                });
            }

            const jobId = `recurring:reminder:${recurringReservationId}`;
            const classStart = recurringReservation.startDate;
            const duration = recurringReservation.sessionDuration ?? 60;
            const classEnd = new Date(classStart.getTime() + duration * 60 * 1000);

            // Job will fetch data and handle recursive scheduling
            await classQueue.add('recurring:reminder', {
                recurringReservationId,
                locationId,
                reminderCount: 0,
                data: {
                    member: {
                        firstName: recurringReservation.member.firstName,
                        lastName: recurringReservation.member.lastName,
                        email: recurringReservation.member.email,
                    },
                    location: {
                        name: recurringReservation.location.name,
                        email: recurringReservation.location.email,
                        phone: recurringReservation.location.phone,
                        address: recurringReservation.location.address,
                    },
                    class: {
                        name: recurringReservation.programName || 'Scheduled Class',
                        startTime: classStart,
                        endTime: classEnd,
                        duration,
                        instructor: recurringReservation.staff ? {
                            firstName: recurringReservation.staff.firstName,
                            lastName: recurringReservation.staff.lastName,
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
                message: `Recurring class reminders scheduled for recurring reservation ${recurringReservationId}`,
                jobId
            };
        } catch (error) {
            console.error('Error scheduling recurring class reminder:', error);
            throw new Error(`Failed to schedule: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    })
        .delete('/recurring/:recurringReservationId', async ({ params }: { params: CancelRecurringClassReminderParams }) => {
            const { recurringReservationId } = params;

            try {
                // Remove all reminder jobs for this recurring reservation (including numbered reminders)
                let removedCount = 0;

                // Try to remove the main job
                const mainJobId = `recurring:reminder:${recurringReservationId}`;
                const mainJob = await classQueue.getJob(mainJobId);
                if (mainJob) {
                    await mainJob.remove();
                    removedCount++;
                }

                // Remove numbered reminder jobs created by recurring processor.
                for (let i = 0; i < 100; i++) {
                    const reminderJobId = `recurring-class-reminder-${recurringReservationId}-reminder-${i}`;
                    const reminderJob = await classQueue.getJob(reminderJobId);
                    if (reminderJob) {
                        await reminderJob.remove();
                        removedCount++;
                    }
                }

                return {
                    success: true,
                    message: `Cancelled ${removedCount} recurring class reminder(s) for recurring reservation ${recurringReservationId}`,
                    removedCount
                };
            } catch (error) {
                console.error('Error cancelling recurring class reminder:', error);
                throw new Error(`Failed to cancel: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
}
