import { redisConfig } from "@/config";
import { db } from "@/db/db";
import { EmailSender } from "@/libs/email";
import { emailQueue, invoiceQueue } from "@/libs/queues";
import { Worker } from "bullmq";
import { addDays, addWeeks, addMonths, addYears } from "date-fns";

async function fetchSubscriptionData(subscriptionId: string) {
    const subscription = await db.query.memberSubscriptions.findFirst({
        where: (memberSubscriptions, { eq }) => eq(memberSubscriptions.id, subscriptionId),
        with: {
            plan: true,
        }
    });

    if (!subscription) {
        throw new Error(`Subscription not found for ID: ${subscriptionId}`);
    }

    return {
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        cancelAt: subscription.cancelAt,
        currentPeriodEnd: subscription.currentPeriodEnd,
        memberPlanId: subscription.memberPlanId,
    };
}

async function fetchMemberData(memberId: string) {
    const member = await db.query.members.findFirst({
        where: (members, { eq }) => eq(members.id, memberId),
    });

    if (!member) {
        throw new Error(`Member not found for ID: ${memberId}`);
    }

    return {
        email: member.email,
        firstName: member.firstName,
        lastName: member.lastName,
    };
}

async function fetchLocationData(locationId: string) {
    // TODO: Implement database query to fetch location
    // Should return: name, address, email, phone
    const location = await db.query.locations.findFirst({
        where: (locations, { eq }) => eq(locations.id, locationId),
    });

    if (!location) {
        throw new Error(`Location not found for ID: ${locationId}`);
    }

    return {
        name: location.name,
        address: location.address,
        email: location.email,
        phone: location.phone,
    };
}

async function fetchPlanData(planId: string) {
    // TODO: Implement database query to fetch plan
    // Should return: name, description, price, interval, intervalThreshold
    const plan = await db.query.memberPlans.findFirst({
        where: (memberPlans, { eq }) => eq(memberPlans.id, planId),
    });

    if (!plan) {
        throw new Error(`Plan not found for ID: ${planId}`);
    }

    return {
        name: plan.name,
        description: plan.description,
        price: plan.price,
        interval: plan.interval,
        intervalThreshold: plan.intervalThreshold,
    };
}

async function fetchInvoiceData(invoiceId: string) {
    const invoice = await db.query.memberInvoices.findFirst({
        where: (memberInvoices, { eq }) => eq(memberInvoices.id, invoiceId),
        with: {
            member: true,
            location: true,
        }
    });

    if (!invoice) {
        throw new Error(`Invoice not found for ID: ${invoiceId}`);
    }

    return invoice;
}

function calculateNextPeriodEnd(
    currentPeriodEnd: Date,
    interval: string,
    intervalThreshold: number
): Date {
    switch (interval) {
        case 'day':
            return addDays(currentPeriodEnd, intervalThreshold);
        case 'week':
            return addWeeks(currentPeriodEnd, intervalThreshold);
        case 'month':
            return addMonths(currentPeriodEnd, intervalThreshold);
        case 'year':
            return addYears(currentPeriodEnd, intervalThreshold);
        default:
            throw new Error(`Invalid interval: ${interval}`);
    }
}

export const invoiceWorker = new Worker('invoices', async (job) => {
    const {name, data} = job;
    if (name === 'process-recurring-invoice') {
        const { subscriptionId, memberId, locationId } = job.data;
            console.log(`📅 Processing recurring invoice job [${job.id}] for subscription ${subscriptionId}`);

            try {
                const subscription = await fetchSubscriptionData(subscriptionId);
                const plan = await fetchPlanData(subscription.memberPlanId);
                // Check if subscription is still active
                if (!subscription || !['active', 'trialing'].includes(subscription.status)) {
                    console.log(`⏭️ Subscription ${subscriptionId} is not active (${subscription?.status}). Stopping reminders.`);
                    return; // Exit without rescheduling
                }

                // Check if subscription is set to cancel
                if (subscription.cancelAtPeriodEnd || subscription.cancelAt) {
                    console.log(`⏭️ Subscription ${subscriptionId} is set to cancel. Stopping reminders.`);
                    return;
                }

                const now = new Date();
                const currentPeriodEnd = new Date(subscription.currentPeriodEnd);
                const reminderDate = addDays(currentPeriodEnd, -10); // 10 days before due

                if (now >= reminderDate && now < currentPeriodEnd) {
                    console.log(`📧 Sending invoice reminder for subscription ${subscriptionId}`);
                    
                    // Fetch member and location data
                    const member = await fetchMemberData(memberId);
                    const location = await fetchLocationData(locationId);

                    const invoiceItems = [{
                        name: plan.name,
                        description: plan.description,
                        quantity: 1,
                        price: plan.price,
                    }];

                    // Send email via email queue
                    await emailQueue.add('send-email', {
                        to: member.email,
                        subject: `Upcoming Payment: ${plan.name}`,
                        template: 'InvoiceReminderEmail',
                        metadata: {
                            member: {
                                firstName: member.firstName,
                                lastName: member.lastName,
                                email: member.email,
                            },
                            invoice: {
                                id: `${subscriptionId}-${currentPeriodEnd.getTime()}`,
                                total: plan.price,
                                dueDate: currentPeriodEnd.toISOString(),
                                description: `${plan.name} - Recurring Payment`,
                                items: invoiceItems,
                            },
                            location: {
                                name: location.name,
                                address: location.address,
                                email: location.email,
                                phone: location.phone,
                            },
                        },
                    });

                    console.log(`✅ Invoice reminder sent for subscription ${subscriptionId}`);
                }

                let nextCheckDate: Date;

                if (now < currentPeriodEnd) {
                    // If current period hasn't ended, check right after it ends
                    nextCheckDate = addDays(currentPeriodEnd, 1);
                } else {
                    // Calculate next period end based on interval
                    const nextPeriodEnd = calculateNextPeriodEnd(
                        currentPeriodEnd,
                        plan.interval!,
                        plan.intervalThreshold!
                    );
                    nextCheckDate = addDays(nextPeriodEnd, -10); // Check 10 days before
                }

                const delay = Math.max(0, nextCheckDate.getTime() - Date.now());
                
                console.log(`🔄 Rescheduling next check for ${nextCheckDate.toISOString()} (delay: ${Math.round(delay / 1000 / 60)} minutes)`);
                // Reschedule the job recursively
                await invoiceQueue.add('process-recurring-invoice', {
                    subscriptionId,
                    memberId,
                    locationId,
                }, {
                    jobId: `recurring-invoice-${subscriptionId}`,
                    delay,
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 5000
                    }
                });

            } catch(e) {
                console.error(`❌ Error processing recurring invoice for subscription ${subscriptionId}:`, e);
                throw e;
        }
    }

    // Handle one-off invoice reminders (new logic)
    if (name === 'send-one-off-invoice-reminder') {
        const { invoiceId } = data;
        console.log(`📧 Processing one-off invoice reminder [${job.id}] for invoice ${invoiceId}`);
        
        try {
            const invoice = await fetchInvoiceData(invoiceId);
            
            // Skip if already paid or cancelled
            if (['paid', 'void', 'uncollectible'].includes(invoice.status)) {
                console.log(`⏭️ Skipping reminder for invoice ${invoiceId} - status: ${invoice.status}`);
                return;
            }
            
            // Queue email to the email worker (keeps email worker clean!)
            await emailQueue.add('send-email', {
                to: invoice.member.email,
                subject: `Invoice Reminder: ${invoice.description}`,
                template: 'InvoiceReminderEmail',
                metadata: {
                    member: {
                        firstName: invoice.member.firstName,
                        lastName: invoice.member.lastName,
                        email: invoice.member.email,
                    },
                    invoice: {
                        id: invoice.id,
                        total: invoice.total,
                        dueDate: invoice.dueDate,
                        description: invoice.description,
                        items: invoice.items || [],
                    },
                    location: {
                        name: invoice.location.name,
                        address: invoice.location.address,
                        email: invoice.location.email,
                        phone: invoice.location.phone,
                    },
                },
            });
            
            console.log(`✅ One-off invoice reminder sent for ${invoiceId}`);
        } catch (error) {
            console.error(`❌ Error sending one-off invoice reminder for ${invoiceId}:`, error);
            throw error;
        }
        return;
    }

    // If we get here, unknown job type
    throw new Error(`Unknown job type: ${name}`);

}, {
    connection: redisConfig
})

