import { classQueue } from "@/workers/queues";
import type Elysia from "elysia";

type ScheduleRecurringClassReminderBody = {
    recurringReservationId: string;
    locationId: string;
}

type CancelRecurringClassReminderParams = {
    recurringReservationId: string;
}

export async function recurringClassReminderRoutes(app: Elysia) {
    return app.post('/recurring', async ({ body }) => {
        const { recurringReservationId, locationId } = body as ScheduleRecurringClassReminderBody;

        try {
            const jobId = `recurring:reminder:${recurringReservationId}`;

            // Job will fetch data and handle recursive scheduling
            await classQueue.add('recurring:reminder', {
                recurringReservationId,
                locationId,
                reminderCount: 0,
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

                // Remove all numbered reminder jobs
                for (let i = 0; i < 100; i++) { // Max 100 reminders (should be enough for any recurring schedule)
                    const reminderJobId = `recurring:reminder:${recurringReservationId}:reminder:${i}`;
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

