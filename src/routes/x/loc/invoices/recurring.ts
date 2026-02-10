import { invoiceQueue } from "@/workers/queues";
import { db } from "@/db/db";
import type Elysia from "elysia";
import { z } from "zod";
import { desc } from "drizzle-orm";

const ScheduleRecurringInvoiceProps = {
    body: z.object({
        subscriptionId: z.string(),
        memberId: z.string(),
        locationId: z.string(),
    }),
};

const CancelRecurringInvoiceProps = {
    params: z.object({
        subscriptionId: z.string(),
    }),
};

export async function recurringInvoiceRoutes(app: Elysia) {
    return app.post('/recurring', async ({ body, params, status }) => {
        const { subscriptionId, memberId, locationId } = body;
        const { lid } = params as { lid: string };

        try {
            if (locationId !== lid) {
                return status(400, {
                    success: false,
                    message: `locationId in body (${locationId}) does not match route lid (${lid})`
                });
            }

            const invoice = await db.query.memberInvoices.findFirst({
                where: (inv, { and, eq }) => and(
                    eq(inv.memberSubscriptionId, subscriptionId),
                    eq(inv.memberId, memberId),
                    eq(inv.locationId, locationId),
                ),
                with: {
                    member: true,
                    location: true,
                },
                orderBy: (inv) => desc(inv.dueDate),
            });

            if (!invoice) {
                return status(404, {
                    success: false,
                    message: `No invoice found for subscription ${subscriptionId} at location ${locationId}`,
                });
            }

            if (!invoice.member || !invoice.location) {
                return status(422, {
                    success: false,
                    message: `Invoice ${invoice.id} is missing member/location context`,
                });
            }

            const jobId = `invoice:recurring:${subscriptionId}`;

            const items = (invoice.items || []).map((item: any) => ({
                name: item?.name ?? 'Line Item',
                description: item?.description ?? null,
                quantity: Number(item?.quantity ?? 1),
                price: Number(item?.price ?? 0),
            }));

            await invoiceQueue.add('reminder', {
                subscriptionId,
                memberId,
                locationId,
                invoiceId: invoice.id,
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
                    invoice: {
                        id: invoice.id,
                        total: invoice.total,
                        dueDate: invoice.dueDate,
                        description: invoice.description,
                        items,
                        status: invoice.status,
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
                message: `Recurring invoice reminders scheduled for subscription ${subscriptionId}`,
                jobId
            };
        } catch (error) {
            console.error('Error scheduling recurring invoice:', error);
            throw new Error(`Failed to schedule: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }, ScheduleRecurringInvoiceProps).delete('/recurring/:subscriptionId', async ({ params }) => {
        const { subscriptionId } = params;

        try {
            // Remove all reminder jobs for this subscription (including numbered reminders)
            let removedCount = 0;

            // Try to remove the main job (for pre-due reminders)
            const mainJobId = `invoice:recurring:${subscriptionId}`;
            const mainJob = await invoiceQueue.getJob(mainJobId);
            if (mainJob) {
                await mainJob.remove();
                removedCount++;
            }

            // Legacy main job id
            const legacyMainJobId = `recurring-invoice-${subscriptionId}`;
            const legacyMainJob = await invoiceQueue.getJob(legacyMainJobId);
            if (legacyMainJob) {
                await legacyMainJob.remove();
                removedCount++;
            }

            // Remove all numbered reminder jobs (overdue reminders)
            for (let i = 0; i < 10; i++) { // Max 10 reminders
                const reminderJobId = `recurring-invoice-${subscriptionId}-reminder-${i}`;
                const reminderJob = await invoiceQueue.getJob(reminderJobId);
                if (reminderJob) {
                    await reminderJob.remove();
                    removedCount++;
                }
            }

            return {
                success: true,
                message: `Cancelled ${removedCount} recurring invoice reminder(s) for subscription ${subscriptionId}`,
                removedCount
            };
        } catch (error) {
            console.error('Error cancelling recurring invoice:', error);
            throw new Error(`Failed to cancel: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }, CancelRecurringInvoiceProps);
}
