import { db } from "@/db/db"
import { memberLocations, memberRewards } from "@/db/schemas"
import { and, eq, sql } from "drizzle-orm"
import { Elysia } from "elysia"
import { z } from "zod";
const MemberLocationRewardsProps = {
    params: z.object({
        mid: z.string(),
        lid: z.string(),
    }),
    body: z.object({
        rewardId: z.string(),
    }),
};


export function mlRewardsRoutes(app: Elysia) {
    return app.get('/rewards', async ({ params, status }) => {
        const { mid, lid } = params;
        try {
            const rewards = await db.query.memberRewards.findMany({
                where: (r, { eq, and }) => and(eq(r.locationId, lid), eq(r.memberId, mid)),
                with: {
                    reward: true,
                },
            });



            return status(200, rewards);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch achievements" });
        }
    }, MemberLocationRewardsProps).post('/rewards', async ({ params, status, body }) => {
        const { mid, lid } = params;
        const { rewardId } = body;

        try {

            const ml = await db.query.memberLocations.findFirst({
                where: (ml, { eq, and }) => and(eq(ml.locationId, lid), eq(ml.memberId, mid)),
                with: {
                    member: true,
                },
            });

            if (!ml) {
                return status(404, { error: "Member not found at this location" });
            }

            const reward = await db.query.rewards.findFirst({
                where: (r, { eq }) => eq(r.id, rewardId),
            });

            if (!reward) {
                throw new Error("Invalid reward");
            }

            if (ml.points < reward.requiredPoints) {
                throw new Error("Insufficient points");
            }

            const memberRewardCount = await db.select({ count: sql<number>`count(*)` }).from(memberRewards).where(
                and(eq(memberRewards.locationId, lid), eq(memberRewards.memberId, mid), eq(memberRewards.rewardId, rewardId))
            ).then(res => res[0] ? res[0].count : 0);

            if (memberRewardCount >= reward.limitPerMember) {
                throw new Error("Reward limit reached");
            }

            const [newReward] = await db.insert(memberRewards).values({
                memberId: mid,
                locationId: lid,
                rewardId,
                dateClaimed: new Date(),
            }).returning();

            await db.update(memberLocations).set({
                points: ml.points - reward.requiredPoints,
            }).where(and(eq(memberLocations.memberId, mid), eq(memberLocations.locationId, lid)));


            return status(200, { ...newReward, reward: reward });

        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to add reward" });
        }
    }, MemberLocationRewardsProps)
}

