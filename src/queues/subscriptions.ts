
import { redisConfig } from "@/config";
import { Queue } from "bullmq";
import type { Member, Location, MemberPlanPricing } from "@subtrees/types";


export const subQueue = new Queue('subscriptions', {
    connection: redisConfig,
    defaultJobOptions: {
        attempts: 6,
        removeOnFail: true,
        removeOnComplete: true,
        backoff: {
            type: 'exponential',
            delay: 24 * 60 * 60 * 1000,
        }
    }
});
subQueue.on('error', (err) => {
    console.error('Subscription renewal error:', err);
});

export type SubscriptionRenewalData = {
    sid: string;
    lid: string;
    taxRate: number;
    stripeCustomerId: string;
    pricing: {
        name: string;
        price: number;
        currency: string;
        interval: "day" | "week" | "month" | "year";
    };
    discount?: {
        amount: number;
        duration: number;
        durationInMonths: number;
    }
}



type ScheduleRenewalProps = {
    startDate: Date;
    interval: "day" | "week" | "month" | "year";
    data: SubscriptionRenewalData;
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
    }

    return await subQueue.upsertJobScheduler(`renewal:static:${sid}`, {
        pattern,
        utc: true,
        startDate: startDate,
    }, {
        name: `renewal:static:${sid}`,
        data: data,
    });
}

export async function scheduleRecursiveRenewal({
    startDate,
    data,
}: {
    startDate: Date;
    data: SubscriptionRenewalData;
}) {
    const { sid } = data;
    await subQueue.add('renewal:recursive', data, {
        jobId: `renewal:recursive:${sid}`,
        delay: Math.max(0, startDate.getTime() - Date.now()),
    });
}
