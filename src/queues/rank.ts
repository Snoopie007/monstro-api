import { Queue } from "bullmq";
import { redisConfig, queueConfig } from "@/config";
import { RANK_QUEUE, type RankAttendanceTriggerData } from "@subtrees/bullmq";

export const rankQueue = new Queue<RankAttendanceTriggerData>(RANK_QUEUE, {
    connection: redisConfig,
    defaultJobOptions: queueConfig.defaultJobOptions,
});

rankQueue.on("error", (err) => {
    console.error("Rank queue error:", err);
});
