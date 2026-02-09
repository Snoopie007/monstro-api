// import { redisConfig } from "@/config";
// import { db } from "@/db/db";
// import { Worker } from "bullmq";
// import { z } from "zod";
// const subData = z.object({
//     subId: z.string(),
// }).strict();

// export const subscriptionWorker = new Worker('subscriptions', async (job) => {
//     const { name } = job; z
//     const parseData = subData.safeParse(job.data);
//     if (!parseData.success) {
//         console.error(`Invalid subscription data:`, job.id);
//         return; // skip silently, or throw to retry
//     }

//     const { subId } = parseData.data;

//     try {
//         const sub = await db.query.memberSubscriptions.findFirst({
//             where: (subs, { eq }) => eq(subs.id, subId),
//             with: {
//                 pricing: true,
//             },
//         });
//         if (!sub) {
//             console.error(`❌ Subscription not found:`, subId);
//             //remove job
//             await job.remove();
//             return;
//         }

//         if (sub.status === 'canceled') {
//             console.error(`❌ Subscription is canceled:`, subId);
//             //remove job
//             await job.remove();
//             return;
//         }

//         const { currentPeriodEnd, currentPeriodStart } = sub;

//         // Handle subscription processing
//         return;
//     } catch (error) {
//         console.error(`❌ Error processing subscription job:`, error);
//         throw error;
//     }
// }, {
//     connection: redisConfig
// });