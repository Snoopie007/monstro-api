import { classQueue } from "@/workers/queues";
import type Elysia from "elysia";

type ScheduleMissedClassCheckBody = {
    reservationId: string;
    locationId: string;
}

type CancelMissedClassCheckParams = {
    reservationId: string;
}

export async function missedClassCheckRoutes(app: Elysia) {
    return app.post('/missed', async ({ body }) => {
        const { reservationId, locationId } = body as ScheduleMissedClassCheckBody;

        try {
            const jobId = `missed-class-${reservationId}`;

            // Job will fetch data and determine check timing
            await classQueue.add('check-missed-class', {
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
                const jobId = `missed-class-${reservationId}`;
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

