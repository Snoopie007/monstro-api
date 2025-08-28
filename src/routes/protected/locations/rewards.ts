import { db } from "@/db/db";
import Elysia from "elysia";

export async function locationRewards(app: Elysia) {
    return app.get('/rewards', async ({ params, status }) => {
        const { lid } = await params as { lid: string };

        try {
            const rewards = await db.query.rewards.findMany({
                where: (reward, { eq }) => eq(reward.locationId, lid),
            });

            return status(200, rewards);
        } catch (error) {
            console.error(error);
            return status(500, "Failed to fetch rewards");
        }
    })
}
