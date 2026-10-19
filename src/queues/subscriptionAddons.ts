import { redisConfig } from "@/config";
import { paymentQueue } from "./payments";
import type { SubscriptionAddonJobData } from "@/subtrees/bullmq";
import { Queue } from "bullmq";

export const subscriptionAddonQueue = new Queue<SubscriptionAddonJobData>("subscription-addons", {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 60_000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

subscriptionAddonQueue.on("error", (error) => {
  console.error("Subscription add-on queue error:", error);
});

export async function enqueueAddonJob(
  name: "activate" | "renew" | "cancel",
  memberSubscriptionAddonId: string,
  runAt = new Date(),
) {
  const jobId = name === "activate"
    ? `subscription-addon:${name}:${memberSubscriptionAddonId}`
    : `subscription-addon-${name}:${memberSubscriptionAddonId}:${runAt.getTime()}`;

  return subscriptionAddonQueue.add(name, { memberSubscriptionAddonId }, {
    jobId,
    delay: Math.max(0, runAt.getTime() - Date.now()),
  });
}

/** Active jobs observe the canceled record when they settle. Remove all other
 * queued work for this purchase, including activation and renewal retries. */
export async function removeAddonJobs(memberSubscriptionAddonId: string) {
  const jobs = await subscriptionAddonQueue.getJobs(["waiting", "delayed", "paused", "active"]);

  for (const job of jobs) {
    if (job.data.memberSubscriptionAddonId !== memberSubscriptionAddonId) continue;

    if (await job.getState() !== "active") await job.remove();
  }
}

export function enqueueAddonRetry(data: { invoiceId: string; memberSubscriptionAddonId: string }) {
  return paymentQueue.add("retry:subscription-addon", data, {
    jobId: `retry-subscription-addon-${data.invoiceId}`, delay: 24 * 60 * 60 * 1000,
    attempts: 3, backoff: { type: "fixed", delay: 24 * 60 * 60 * 1000 }, removeOnFail: false,
  });
}
