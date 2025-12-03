import { db } from "@/db/db";
import Elysia from "elysia";
import { z } from "zod";
const LocationRewardsProps = {
    params: z.object({
        lid: z.string(),
    }),
};
export async function locationRewards(app: Elysia) {
    return app.get('/rewards', async ({ params, status }) => {
        const { lid } = params;

        try {
            const rewards = await db.query.rewards.findMany({
                where: (reward, { eq }) => eq(reward.locationId, lid),
            });

            return status(200, rewards);
        } catch (error) {
            console.error(error);
            return status(500, "Failed to fetch rewards");
        }
    }, LocationRewardsProps)
}
