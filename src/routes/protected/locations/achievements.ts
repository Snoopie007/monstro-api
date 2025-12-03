import { db } from "@/db/db";
import type { Elysia } from "elysia";
import { z } from "zod";

const LocationAchievementsProps = {
    params: z.object({
        lid: z.string(),
    }),
};

export async function locationAchievements(app: Elysia) {
    return app.get('/achievements', async ({ params, status }) => {
        const { lid } = params;

        try {
            const achievements = await db.query.achievements.findMany({
                where: (achievement, { eq }) => eq(achievement.locationId, lid),
            });

            return status(200, achievements);
        } catch (error) {
            console.error(error);
            return status(500, "Failed to fetch achievements");
        }
    }, LocationAchievementsProps)
}
