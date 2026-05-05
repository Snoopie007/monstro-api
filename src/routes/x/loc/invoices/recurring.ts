import { invoiceQueue } from "@/queues";
import { db } from "@/db/db";
import type Elysia from "elysia";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";

type RecurringInvoiceMetadata = {
    type?: string;
    collectionMethod?: "send_invoice" | "charge_automatically";
    paymentMethodId?: string;
    gatewayService?: string;
    seriesId?: string;
    recurringSettings?: {
        interval?: "day" | "week" | "month" | "year";
        intervalCount?: number;
        startDate?: string;
        endDate?: string;
    };
};

const CancelRecurringInvoiceProps = {
    params: z.object({
        subscriptionId: z.string(),
    }),
};

async function scheduleRecurringInvoice(invoice: any) {
    if (!invoice.member || !invoice.location) {
        throw new Error(`Invoice ${invoice.id} is missing member/location context`);
    }

    if (invoice.invoiceType !== "recurring") {
        throw new Error(`Invoice ${invoice.id} is not recurring`);
    }

    const metadata = (invoice.metadata || {}) as RecurringInvoiceMetadata;
    const { collectionMethod, paymentMethodId, gatewayService } = metadata;
    const recurringSettings = metadata.recurringSettings;

    if (!recurringSettings?.interval) {
        throw new Error(`Invoice ${invoice.id} is missing recurring settings`);
    }

    if (!collectionMethod) {
        throw new Error(`Invoice ${invoice.id} is missing collection method`);
    }

    if (collectionMethod === "charge_automatically" && !paymentMethodId) {
        throw new Error(`Invoice ${invoice.id} is missing payment method for auto-charge`);
    }

    const seriesId = metadata.seriesId || invoice.id;
    const dueDate = new Date(invoice.dueDate);
    const items = (invoice.items || []).map((item: any) => ({
        name: item?.name ?? 'Line Item',
        description: item?.description ?? null,
        quantity: Number(item?.quantity ?? 1),
        price: Number(item?.price ?? 0),
    }));

    await invoiceQueue.add('recurring:invoice', {
        seriesId,
        subscriptionId: invoice.memberPlanId || undefined,
        memberId: invoice.memberId,
        locationId: invoice.locationId,
        invoiceId: invoice.id,
        collectionMethod,
        paymentMethodId,
        gatewayService,
        dueDate: dueDate.toISOString(),
        recurringSettings,
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
        jobId: `invoice:recurring:${invoice.id}`,
        delay: Math.max(0, dueDate.getTime() - Date.now()),
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
    });

    return `invoice:recurring:${invoice.id}`;
}

export async function recurringInvoiceRoutes(app: Elysia) {
    return app
        .post('/:iid/recurring', async ({ body, params, status }) => {
            const { lid, iid } = params as { lid: string; iid: string };
            const { memberId } = body;

            const invoice = await db.query.memberInvoices.findFirst({
                where: (inv, { and, eq }) => and(
                    eq(inv.id, iid),
                    eq(inv.memberId, memberId),
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
                    message: `Invoice ${iid} not found at location ${lid}`,
                });
            }

            try {
                const jobId = await scheduleRecurringInvoice(invoice);
                return { success: true, message: `Recurring invoice scheduled for ${iid}`, jobId };
            } catch (error) {
                return status(400, {
                    success: false,
                    message: error instanceof Error ? error.message : 'Failed to schedule recurring invoice',
                });
            }
        }, {
            body: z.object({ memberId: z.string() }),
        })
        .post('/recurring', async ({ body, params, status }) => {
            const { subscriptionId, memberId, locationId } = body;
            const { lid } = params as { lid: string };

            if (locationId !== lid) {
                return status(400, {
                    success: false,
                    message: `locationId in body (${locationId}) does not match route lid (${lid})`,
                });
            }

            const invoice = await db.query.memberInvoices.findFirst({
                where: (inv, { and, eq }) => and(
                    eq(inv.memberPlanId, subscriptionId),
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

            try {
                const jobId = await scheduleRecurringInvoice(invoice);
                return { success: true, message: `Recurring invoice scheduled for subscription ${subscriptionId}`, jobId };
            } catch (error) {
                return status(400, {
                    success: false,
                    message: error instanceof Error ? error.message : 'Failed to schedule recurring invoice',
                });
            }
        }, {
            body: z.object({
                subscriptionId: z.string(),
                memberId: z.string(),
                locationId: z.string(),
            }),
        })
        .delete('/recurring/:subscriptionId', async ({ params }) => {
            const { subscriptionId } = params;

            try {
                let removedCount = 0;

                const jobs = await invoiceQueue.getJobs(["delayed", "waiting", "active", "completed", "failed"]);
                for (const job of jobs) {
                    const jobSubscriptionId = job.data?.subscriptionId;
                    if (jobSubscriptionId === subscriptionId || job.id === `invoice:recurring:${subscriptionId}`) {
                        await job.remove();
                        removedCount++;
                    }
                }

                const legacyMainJobId = `recurring-invoice-${subscriptionId}`;
                const legacyMainJob = await invoiceQueue.getJob(legacyMainJobId);
                if (legacyMainJob) {
                    await legacyMainJob.remove();
                    removedCount++;
                }

                for (let i = 0; i < 10; i++) {
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
                    removedCount,
                };
            } catch (error) {
                console.error('Error cancelling recurring invoice:', error);
                throw new Error(`Failed to cancel: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }, CancelRecurringInvoiceProps);
}
