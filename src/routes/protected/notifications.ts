import { db } from "@/db/db";
import type { Elysia, Context } from "elysia";
import { z } from "zod";
import { userNotifications } from "subtrees/schemas";


export async function userNotificationRoutes(app: Elysia) {
    app.post('/notification/enable', async ({ body, status, ...ctx }) => {
        const { userId } = ctx as Context & { userId: string };
        const data = body;
        if (!data.token) {
            return status(400, { message: "Push token is required" });
        }
        const today = new Date();
        try {
            await db.insert(userNotifications).values({
                userId,
                ...data,
                enabled: true,
                created: today,
            }).onConflictDoNothing({
                target: [userNotifications.token],
            });
            return status(200, { success: true });
        } catch (error) {
            console.error(error);
            return status(500, { message: "Internal server error" });
        }
    }, {
        body: z.object({
            token: z.string(),
            deviceModelId: z.string().nullish(),
            deviceName: z.string(),
            platform: z.enum(["ios", "android"]),
        }),
    });

    return app;
}