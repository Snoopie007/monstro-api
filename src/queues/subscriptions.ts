
import { redisConfig } from "@/config";
import { Queue } from "bullmq";
import type { RecursiveSubscriptionJobData, SubscriptionJobData } from "@subtrees/bullmq/types";
import { sleep } from "bun";

const MAX_SCHEDULER_ATTEMPTS = 3;
const SCHEDULER_RETRY_DELAY_MS = 500;

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



export async function scheduleCronBasedRenewal({
    startDate,
    interval,
    data,
}: ScheduleRenewalProps) {
    const { sid } = data;
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
    for (let attempt = 1; attempt <= MAX_SCHEDULER_ATTEMPTS; attempt++) {
        try {
            await subQueue.upsertJobScheduler(`renewal:static:${sid}`, {
                pattern,
                utc: true,
                startDate: new Date(startDate),
            }, {
                name: `renewal:static:${sid}`,
                data: data,
            });
            return;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.error(` attempt ${attempt}/${MAX_SCHEDULER_ATTEMPTS} failed:`, lastError.message);
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
    for (let attempt = 1; attempt <= MAX_SCHEDULER_ATTEMPTS; attempt++) {
        try {
            await subQueue.add('renewal:recursive', data, {
                jobId: `renewal:recursive:${sid}`,
                delay: Math.max(0, startDate.getTime() - Date.now()),
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
        `renewal:cash:recursive:${sid}`,
    ];

    for (const jobId of jobIds) {
        const job = await subQueue.getJob(jobId);
        if (job) {
            await job.remove();
        }
    }
}
