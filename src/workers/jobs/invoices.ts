import { addDays, addMinutes } from "date-fns";
import {
    calculateNextPeriodEnd, fetchInvoiceData, fetchLocationData,

    fetchMemberData, fetchPricingData, fetchSubscriptionData
} from "../utils";
import { emailQueue, invoiceQueue } from "@/libs/queues";

export async function processRecurringInvoice(data: {
    jobId: string;
    subscriptionId: string;
    memberId: string;
    locationId: string;
    reminderCount?: number; // Track overdue reminders
}) {
    const { jobId, subscriptionId, memberId, locationId, reminderCount = 0 } = data;
    let reminderCountLocal = reminderCount || 0;
    console.log(`📅 Processing recurring invoice job [${jobId}] for subscription ${subscriptionId} (reminderCount: ${reminderCountLocal})`);

    try {
        const subscription = await fetchSubscriptionData(subscriptionId);
        const pricing = await fetchPricingData(subscription.pricingId);
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

        // Send pre-due reminder 5 days before period end
        const reminderDate = addDays(currentPeriodEnd, -5);

        // Check for overdue 30 minutes after period end
        const overdueThreshold = addMinutes(currentPeriodEnd, 30);

        const isPreDue = now >= reminderDate && now < currentPeriodEnd;
        const isOverdue = now >= overdueThreshold;

        // PRE-DUE: Send reminder 5 days before
        if (isPreDue) {
            console.log(`📧 Sending pre-due reminder for subscription ${subscriptionId}`);

            const member = await fetchMemberData(memberId);
            const location = await fetchLocationData(locationId);

            const invoiceItems = [{
                name: pricing.name,
                description: pricing.description,
                quantity: 1,
                price: pricing.price,
            }];

            await emailQueue.add('send-email', {
                to: member.email,
                subject: `Upcoming Payment: ${pricing.name}`,
                template: 'InvoiceReminderEmail',
                metadata: {
                    member: {
                        firstName: member.firstName,
                        lastName: member.lastName,
                        email: member.email,
                    },
                    invoice: {
                        id: `${subscriptionId}-${currentPeriodEnd.getTime()}`,
                        total: pricing.price,
                        dueDate: currentPeriodEnd.toISOString(),
                        description: `${pricing.name} - Recurring Payment`,
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

            console.log(`✅ Pre-due reminder sent for subscription ${subscriptionId}`);
        }

        // OVERDUE: Check if payment was received
        if (isOverdue) {
            // Re-fetch subscription to get latest status
            const latestSubscription = await fetchSubscriptionData(subscriptionId);

            // Check if payment was made (subscription renewed or status changed)
            const wasRenewed = new Date(latestSubscription.currentPeriodEnd) > currentPeriodEnd;
            const isPaid = latestSubscription.status === 'active' && wasRenewed;

            if (isPaid) {
                console.log(`✅ Payment received for subscription ${subscriptionId}. Moving to next period.`);
                reminderCountLocal = 0; // Reset reminder count

                // Schedule for next period
                const nextPeriodEnd = new Date(latestSubscription.currentPeriodEnd);
                const nextCheckDate = addDays(nextPeriodEnd, -5);
                const delay = Math.max(0, nextCheckDate.getTime() - Date.now());

                await invoiceQueue.add('process-recurring-invoice', {
                    subscriptionId,
                    memberId,
                    locationId,
                    reminderCount: 0,
                }, {
                    jobId: `recurring-invoice-${subscriptionId}`,
                    delay,
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 5000 }
                });
                return;
            }

            // Payment NOT received → Send overdue reminder
            // Days after due date for each reminder
            const reminderSchedule = [0, 2, 5, 7, 14];
            const maxReminders = reminderSchedule.length;

            if (reminderCount >= maxReminders) {
                console.log(`🛑 Reached max overdue reminders for subscription ${subscriptionId}`);
                return; // Stop reminders
            }

            // Send overdue email
            const member = await fetchMemberData(memberId);
            const location = await fetchLocationData(locationId);

            const daysOverdue = Math.floor((now.getTime() - currentPeriodEnd.getTime()) / (1000 * 60 * 60 * 24));

            await emailQueue.add('send-email', {
                to: member.email,
                subject: `Payment Overdue - Immediate Action Required`,
                template: 'OverdueInvoiceEmail',
                metadata: {
                    member: {
                        firstName: member.firstName,
                        lastName: member.lastName,
                        email: member.email,
                    },
                    invoice: {
                        id: `${subscriptionId}-${currentPeriodEnd.getTime()}`,
                        total: pricing.price,
                        dueDate: currentPeriodEnd.toISOString(),
                        daysOverdue: daysOverdue,
                        description: `${pricing.name} - Recurring Payment`,
                        items: [{
                            name: pricing.name,
                            description: pricing.description,
                            quantity: 1,
                            price: pricing.price,
                        }],
                    },
                    location: {
                        name: location.name,
                        address: location.address,
                        email: location.email,
                        phone: location.phone,
                    },
                },
            });

            console.log(`📧 Sent overdue reminder #${reminderCount + 1} for subscription ${subscriptionId} (${daysOverdue} days overdue)`);

            // Schedule next overdue reminder
            if (reminderCount + 1 < maxReminders) {
                const nextReminderIndex = reminderCount + 1;
                const nextOffsetAfterDue = reminderSchedule[nextReminderIndex] || 0;

                // Calculate absolute date for next reminder (from due date)
                const nextReminderDate = addDays(currentPeriodEnd, nextOffsetAfterDue);
                const delay = Math.max(0, nextReminderDate.getTime() - Date.now());

                console.log(`🔄 Scheduling overdue reminder #${nextReminderIndex + 1} for ${nextReminderDate.toISOString()} (${nextOffsetAfterDue} days after due)`);

                await invoiceQueue.add('process-recurring-invoice', {
                    subscriptionId,
                    memberId,
                    locationId,
                    reminderCount: nextReminderIndex,
                }, {
                    jobId: `recurring-invoice-${subscriptionId}-reminder-${nextReminderIndex}`,
                    delay,
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 5000 },
                });
            }
            return;
        }

        // NOT YET DUE: Schedule next check
        let nextCheckDate: Date;

        if (now < currentPeriodEnd) {
            // Check 30 minutes after period ends (for overdue detection)
            nextCheckDate = addMinutes(currentPeriodEnd, 30);
        } else {
            // Calculate next period
            const nextPeriodEnd = calculateNextPeriodEnd(
                currentPeriodEnd,
                pricing.interval!,
                pricing.intervalThreshold!
            );
            // Check 5 days before next period end
            nextCheckDate = addDays(nextPeriodEnd, -5);
        }

        const delay = Math.max(0, nextCheckDate.getTime() - Date.now());

        console.log(`🔄 Rescheduling check for ${nextCheckDate.toISOString()}`);

        await invoiceQueue.add('process-recurring-invoice', {
            subscriptionId,
            memberId,
            locationId,
            reminderCount,
        }, {
            jobId: `recurring-invoice-${subscriptionId}`,
            delay,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 }
        });

    } catch (e) {
        console.error(`❌ Error processing recurring invoice for subscription ${subscriptionId}:`, e);
        throw e;
    }
}

export async function processOneOffInvoice(data: { jobId: string, invoiceId: string }) {
    const { jobId, invoiceId } = data;
    console.log(`📧 Processing one-off invoice reminder [${jobId}] for invoice ${invoiceId}`);

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

export async function checkInvoiceOverdue(data: { invoiceId: string, reminderCount: number }) {
    const { invoiceId, reminderCount = 0 } = data;
    console.log(`⏰ Checking invoice ${invoiceId} for overdue (reminderCount: ${reminderCount})`);

    try {
        // Fetch invoice to check current status
        const invoice = await fetchInvoiceData(invoiceId);

        if (!invoice) {
            console.log(`❌ Invoice ${invoiceId} not found`);
            return;
        }

        // If invoice is paid, void, or uncollectible → stop
        if (['paid', 'void', 'uncollectible'].includes(invoice.status)) {
            console.log(`✅ Invoice ${invoiceId} status is ${invoice.status}. No overdue reminder needed.`);
            return;
        }

        // Invoice is still unpaid → Send overdue reminder
        // Days after due date for each reminder
        const reminderSchedule = [0, 2, 5, 7, 14];
        const maxReminders = reminderSchedule.length;

        if (reminderCount >= maxReminders) {
            console.log(`🛑 Reached maximum overdue reminders (${maxReminders}) for invoice ${invoiceId}`);
            return;
        }

        // Calculate days overdue
        const daysOverdue = Math.floor(
            (Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Send overdue reminder
        await emailQueue.add('send-email', {
            to: invoice.member.email,
            subject: `Payment Overdue - Immediate Action Required`,
            template: 'OverdueInvoiceEmail',
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
                    daysOverdue: daysOverdue,
                    description: invoice.description || 'Payment',
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

        console.log(`📧 Sent overdue reminder #${reminderCount + 1} for invoice ${invoiceId} (${daysOverdue} days overdue)`);

        // Schedule next reminder if not at max
        if (reminderCount + 1 < maxReminders) {
            const nextReminderIndex = reminderCount + 1;
            const nextOffsetAfterDue = reminderSchedule[nextReminderIndex] || 0;

            // Calculate from original due date
            const nextReminderDate = addDays(new Date(invoice.dueDate), nextOffsetAfterDue);
            const delay = Math.max(0, nextReminderDate.getTime() - Date.now());

            console.log(`🔄 Scheduling reminder #${nextReminderIndex + 1} for ${nextReminderDate.toISOString()} (${nextOffsetAfterDue} days after due)`);

            await invoiceQueue.add('check-invoice-overdue', {
                invoiceId,
                reminderCount: nextReminderIndex,
            }, {
                jobId: `overdue-check-${invoiceId}-reminder-${nextReminderIndex}`,
                delay,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000
                },
            });
        }

    } catch (error) {
        console.error(`❌ Error checking overdue for invoice ${invoiceId}:`, error);
        throw error;
    }
    return;
}
