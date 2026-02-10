import { invoiceQueue } from "@/workers/queues";
import { db } from "@/db/db";
import type Elysia from "elysia";


export async function oneOffInvoiceRoutes(app: Elysia) {
    return app.post('/reminder', async ({ body, params, status }) => {
        const { invoiceId, sendAt } = body as {
            invoiceId: string;
            sendAt: string;
        };
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
            const jobId = `invoice:reminder:${invoiceId}`;

            const items = (invoice.items || []).map((item: any) => ({
                name: item?.name ?? 'Line Item',
                description: item?.description ?? null,
                quantity: Number(item?.quantity ?? 1),
                price: Number(item?.price ?? 0),
            }));

            // Add to INVOICE queue, not email queue
            await invoiceQueue.add('reminder', {
                invoiceId,
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
                delay,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000
                }
            });

            return {
                success: true,
                message: `Invoice reminder scheduled for ${sendAt}`,
                jobId
            };
        } catch (error) {
            console.error('Error scheduling invoice reminder:', error);
            throw new Error(`Failed to schedule: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    })
        .delete('/reminder/:invoiceId', async ({ params }) => {
            const { invoiceId } = params;
            const jobId = `invoice:reminder:${invoiceId}`;

            try {
                const job = await invoiceQueue.getJob(jobId);
                if (!job) {
                    return { success: false, message: 'Job not found' };
                }
                await job.remove();
                return { success: true, message: 'Reminder cancelled' };
            } catch (error) {
                throw new Error('Failed to cancel reminder');
            }
        });
}
