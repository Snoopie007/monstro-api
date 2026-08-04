import { redisConfig } from "@/config";
import type { SubscriptionAddonJobData } from "@subtrees/bullmq";
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

export async function enqueueSubscriptionAddonJob(
  name: "activate" | "renew" | "cancel" | "expire",
  memberSubscriptionAddonId: string,
  runAt = new Date(),
) {
  const jobId = name === "activate"
    ? `subscription-addon:${name}:${memberSubscriptionAddonId}`
    : `subscription-addon:${name}:${memberSubscriptionAddonId}:${runAt.getTime()}`;

  return subscriptionAddonQueue.add(name, { memberSubscriptionAddonId }, {
    jobId,
    delay: Math.max(0, runAt.getTime() - Date.now()),
  });
}
