import { getDeferredBilling } from "@/subtrees/utils/deferredBilling";

import { db } from "@/db/db";
import { redisConfig } from "@/config";
import { Queue } from "bullmq";
import type { CashSubscriptionJobData, RecursiveSubscriptionJobData, SubscriptionJobData } from "@/subtrees/bullmq/types";
import { getStripeMigration, getSubscriptionBillingQuote } from "@/subtrees/utils/subscriptionBilling";
import { sleep } from "bun";

const MAX_SCHEDULER_ATTEMPTS = 3;
const SCHEDULER_RETRY_DELAY_MS = 500;
const EXACT_RENEWAL_JOB_OPTIONS = {
    attempts: 12,
    backoff: {
        type: "exponential" as const,
        delay: 24 * 60 * 60 * 1000,
    },
    removeOnFail: false,
    removeOnComplete: true,
};

export const subQueue = new Queue('subscriptions', {
    connection: redisConfig,
    defaultJobOptions: {
        attempts: 1,
        removeOnFail: true,
        removeOnComplete: true,
    }
});

subQueue.on('error', (err) => {
    console.error('Subscription renewal error:', err);
});




type ScheduleRenewalProps = {
    startDate: Date;
    interval: "day" | "week" | "month" | "year";
    data: SubscriptionJobData;
}



/** Schedule the next cash invoice for its due date and time. Called when activating or resuming a subscription. */
export async function scheduleCashRenewal(dueAt: Date, data: CashSubscriptionJobData) {
    return subQueue.add("renewal:cash:recursive", { ...data, recurrenceCount: 1 }, {
        jobId: `cashInvoiceDue_${data.sid}_${dueAt.getTime()}`,
        delay: Math.max(0, dueAt.getTime() - Date.now()),
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
    });
}

export async function scheduleCronBasedRenewal({
    startDate,
    interval,
    data,
}: ScheduleRenewalProps) {
    const { sid } = data;
    if (data.expectedDueAt) {
        const dueAt = new Date(data.expectedDueAt);
        if (!Number.isFinite(dueAt.getTime())) throw new Error("Invalid expectedDueAt");
        await subQueue.add("renewal:recursive", {
            ...data,
            recurrenceCount: 1,
        }, {
            ...EXACT_RENEWAL_JOB_OPTIONS,
            jobId: `renewal-exact-${sid}-${dueAt.getTime()}`,
            delay: Math.max(0, dueAt.getTime() - Date.now()),
        });
        return;
    }
    const UTCDate = startDate.getUTCDate();
    const UTCHour = startDate.getUTCHours();
    const UTCMinute = startDate.getUTCMinutes();

    let pattern: string | undefined = undefined;
    if (interval === "month") {
        pattern = `${UTCMinute} ${UTCHour} ${UTCDate} * *`;
    } else if (interval === "year") {
        pattern = `${UTCMinute} ${UTCHour} ${UTCDate} * *`;
    };



    let lastError: Error | null = null;
    const DayBeforeStart = startDate.setDate(startDate.getDate() - 1);
    for (let attempt = 1; attempt <= MAX_SCHEDULER_ATTEMPTS; attempt++) {
        try {
            await subQueue.upsertJobScheduler(`renewal:static:${sid}`, {
                pattern,
                utc: true,
                startDate: DayBeforeStart,
            }, {
                name: `renewal:static:${sid}`,
                data: data,
            });
            return;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.error(`attempt ${attempt}/${MAX_SCHEDULER_ATTEMPTS} failed:`, lastError.message);
            if (attempt < MAX_SCHEDULER_ATTEMPTS) {
                await sleep(SCHEDULER_RETRY_DELAY_MS * attempt);
            }
        }
    }
    throw lastError ?? new Error("scheduleCronBasedRenewal failed");
}

export async function scheduleRecursiveRenewal({
    startDate,
    data,
}: {
    startDate: Date;
    data: RecursiveSubscriptionJobData;
}) {
    const { sid } = data;
    let lastError: Error | null = null;
    const exactDueAt = data.expectedDueAt ? new Date(data.expectedDueAt) : null;
    if (exactDueAt && !Number.isFinite(exactDueAt.getTime())) {
        throw new Error("Invalid expectedDueAt");
    }
    const jobId = exactDueAt
        ? `renewal-exact-${sid}-${exactDueAt.getTime()}`
        : `renewal:recursive:${sid}`;
    const delay = exactDueAt
        ? Math.max(0, exactDueAt.getTime() - Date.now())
        : Math.max(0, startDate.getTime() - Date.now());
    for (let attempt = 1; attempt <= MAX_SCHEDULER_ATTEMPTS; attempt++) {
        try {
            await subQueue.add("renewal:recursive", data, {
                ...(exactDueAt ? EXACT_RENEWAL_JOB_OPTIONS : {}),
                jobId,
                delay,
            });
            return;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.error(`attempt ${attempt}/${MAX_SCHEDULER_ATTEMPTS} failed:`, lastError.message);
            if (attempt < MAX_SCHEDULER_ATTEMPTS) {
                await sleep(SCHEDULER_RETRY_DELAY_MS * attempt);
            }
        }
    }
    throw lastError ?? new Error("scheduleRecursiveRenewal failed");
}

export async function scheduleRenewalRepair(sid: string, lid: string, dueAt: Date | null) {
    if (!dueAt) return;
    const dueAtMs = dueAt.getTime();
    if (!Number.isFinite(dueAtMs)) throw new Error("Invalid renewal repair dueAt");

    const sub = await db.query.memberSubscriptions.findFirst({
        where: (row, { and, eq }) => and(eq(row.id, sid), eq(row.locationId, lid)),
        with: {
            member: {
                columns: {
                    firstName: true,
                    lastName: true,
                    email: true,
                },
            },
            pricing: {
                with: {
                    plan: true,
                },
            },
            location: {
                with: {
                    taxRates: true,
                },
                columns: {
                    name: true,
                    email: true,
                    phone: true,
                    address: true,
                },
            },
        },
    });
    if (!sub || sub.parentId || sub.paymentType === "cash" || !sub.pricing || !sub.member || !sub.location) return;

    const migration = getStripeMigration(sub.metadata);
    if (!getDeferredBilling(sub.metadata) && (!migration || !["armed", "first_payment_verified"].includes(migration.state))) return;

    if (getDeferredBilling(sub.metadata) && (
        !["active", "past_due"].includes(sub.status)
        || sub.currentPeriodEnd.getTime() !== dueAtMs
        || (sub.cancelAt && sub.cancelAt.getTime() <= Date.now())
    )) return;

    const billingQuote = getSubscriptionBillingQuote(sub);
    const payload: SubscriptionJobData = {
        sid: sub.id,
        lid,
        expectedDueAt: dueAt.toISOString(),
        member: {
            firstName: sub.member.firstName,
            lastName: sub.member.lastName,
            email: sub.member.email,
        },
        location: {
            name: sub.location.name,
            email: sub.location.email,
            phone: sub.location.phone,
            address: sub.location.address,
        },
        taxRate: sub.location.taxRates?.find((tax) => tax.isDefault)?.percentage || 0,
        pricing: {
            name: billingQuote.name,
            price: billingQuote.price,
            interval: billingQuote.interval,
            intervalThreshold: billingQuote.intervalThreshold,
        },
    };
    await subQueue.add("renewal:static", payload, {
        ...EXACT_RENEWAL_JOB_OPTIONS,
        jobId: `renewal-exact-${sid}-${dueAtMs}-recovery`,
        delay: Math.max(0, dueAtMs - Date.now()),
    });
}

export async function removeRenewalJobs(sid: string) {
    const schedulerIds = [
        `renewal:static:${sid}`,
        `renewal:cash:${sid}`,
    ];

    for (const schedulerId of schedulerIds) {
        try {
            await subQueue.removeJobScheduler(schedulerId);
        } catch {
            // no-op
        }
    }

    const jobIds = [
        `renewal:recursive:${sid}`,
        `renewal:cash-recursive:${sid}`,
        `renewal:cash:recursive:${sid}`,
    ];

    for (const jobId of jobIds) {
        const job = await subQueue.getJob(jobId);
        if (job) {
            await job.remove();
        }
    }
    const exactJobs = await subQueue.getJobs(["delayed", "waiting", "active"]);
    for (const job of exactJobs) {
        if (job.id?.startsWith(`cashInvoiceDue_${sid}_`)) {
            if (await job.getState() !== "active") await job.remove();
            continue;
        }
        if (job.id?.startsWith(`renewal-exact-${sid}-`) && await job.getState() !== "active") await job.remove();
    }
}
