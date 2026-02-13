import { invoiceQueue } from "@/queues/tasks";
import { db } from "@/db/db";
import type Elysia from "elysia";
import { z } from "zod";

const ScheduleOverdueCheckProps = {
    body: z.object({
        invoiceId: z.string(),
        sendAt: z.string(),
    }),
};

const CancelOverdueCheckProps = {
    params: z.object({
        invoiceId: z.string(),
    }),
};
export async function overdueInvoiceRoutes(app: Elysia) {
    return app.post('/overdue', async ({ body, params, status }) => {
        const { invoiceId, sendAt } = body;
        const { lid } = params as { lid: string };

        try {
            const sendAtMs = new Date(sendAt).getTime();
            if (Number.isNaN(sendAtMs)) {
                return status(400, {
                    success: false,
                    message: `Invalid sendAt value: ${sendAt}`,
                });
            }

            const invoice = await db.query.memberInvoices.findFirst({
                where: (inv, { and, eq }) => and(
                    eq(inv.id, invoiceId),
                    eq(inv.locationId, lid),
                ),
                with: {
                    member: true,
                    location: true,
                },
            });

            if (!invoice) {
                return status(404, {
                    success: false,
                    message: `Invoice ${invoiceId} not found for location ${lid}`,
                });
            }

            if (!invoice.member || !invoice.location) {
                return status(422, {
                    success: false,
                    message: `Invoice ${invoiceId} is missing member/location context`,
                });
            }

            const delay = Math.max(0, new Date(sendAt).getTime() - Date.now());
            const jobId = `invoice:overdue:${invoiceId}`;

            await invoiceQueue.add('overdue', {
                invoiceId,
                reminderCount: 0, // Start at 0
                data: {
                    member: {
                        firstName: invoice.member.firstName,
                        lastName: invoice.member.lastName,
                        email: invoice.member.email,
                    },
                    location: {
                        name: invoice.location.name,
                        email: invoice.location.email,
                        phone: invoice.location.phone,
                    },
                },
            }, {
                jobId,
                delay,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000
                }
            });

            return {
                success: true,
                message: `Overdue check scheduled for invoice ${invoiceId}`,
                jobId
            };
        } catch (error) {
            console.error('Error scheduling overdue check:', error);
            throw new Error(`Failed to schedule: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }, ScheduleOverdueCheckProps).delete('/overdue/:invoiceId', async ({ params }) => {
        const { invoiceId } = params;

        try {
            // Remove all reminder jobs for this invoice (including numbered reminders)
            let removedCount = 0;

            // Try to remove the main job
            const mainJobId = `invoice:overdue:${invoiceId}`;
            const mainJob = await invoiceQueue.getJob(mainJobId);
            if (mainJob) {
                await mainJob.remove();
                removedCount++;
            }

            // Legacy main job id
            const legacyMainJobId = `overdue:${invoiceId}`;
            const legacyMainJob = await invoiceQueue.getJob(legacyMainJobId);
            if (legacyMainJob) {
                await legacyMainJob.remove();
                removedCount++;
            }

            // Remove all numbered reminder jobs
            for (let i = 0; i < 10; i++) { // Max 10 reminders
                const reminderJobId = `overdue:${invoiceId}:reminder:${i}`;
                const reminderJob = await invoiceQueue.getJob(reminderJobId);
                if (reminderJob) {
                    await reminderJob.remove();
                    removedCount++;
                }

                // Current worker recurring overdue reminder id format
                const dashedReminderJobId = `invoice-overdue-${invoiceId}-reminder-${i}`;
                const dashedReminderJob = await invoiceQueue.getJob(dashedReminderJobId);
                if (dashedReminderJob) {
                    await dashedReminderJob.remove();
                    removedCount++;
                }
            }

            return {
                success: true,
                message: `Cancelled ${removedCount} overdue reminder(s) for invoice ${invoiceId}`,
                removedCount
            };
        } catch (error) {
            console.error('Error cancelling overdue check:', error);
            throw new Error(`Failed to cancel: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }, CancelOverdueCheckProps);
}
