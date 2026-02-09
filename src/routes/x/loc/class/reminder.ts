import { classQueue } from "@/workers/queues";
import type Elysia from "elysia";

type ScheduleClassReminderBody = {
    reservationId: string;
    locationId: string;
}

type CancelClassReminderParams = {
    reservationId: string;
}

export async function classReminderRoutes(app: Elysia) {
    return app.post('/reminder', async ({ body }) => {
        const { reservationId, locationId } = body as ScheduleClassReminderBody;

        try {
            const jobId = `class:reminder:${reservationId}`;

            // Job will fetch reservation data and calculate timing
            await classQueue.add('class:reminder', {
                reservationId,
                locationId,
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

