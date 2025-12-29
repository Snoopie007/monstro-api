import { db } from "@/db/db";
import type { Elysia, Context } from "elysia";
import { z } from "zod";
import { userNotifications } from "@/db/schemas";

const MobilePushTokenSchema = {
    body: z.object({
        token: z.string(),
        deviceModelId: z.string().nullish(),
        deviceName: z.string(),
        platform: z.enum(["ios", "android"]),
    }),
};

export async function userPushTokenRoutes(app: Elysia) {
    app.post('/push-token', async ({ body, status, ...ctx }) => {
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
                created: today,
            });
            return status(200, { success: true });
        } catch (error) {
            console.error(error);
            return status(500, { message: "Internal server error" });
        }
    }, MobilePushTokenSchema);
    return app;
}