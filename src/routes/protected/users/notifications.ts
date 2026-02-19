import { db } from "@/db/db";
import { Elysia, t } from "elysia";
import { userNotifications } from "subtrees/schemas";
import { eq } from "drizzle-orm";


export async function userNotificationRoutes(app: Elysia) {

    app.group('/notifications', (app) => {
        app.get('/', async ({ status, params }) => {
            const { uid } = params;
            try {
                const notifications = await db.query.userNotifications.findMany({
                    where: eq(userNotifications.userId, uid),
                });
                return status(200, notifications);
            } catch (error) {
                console.error(error);
                return status(500, { message: "Internal server error", code: "INTERNAL_SERVER_ERROR" });
            }
        }, {
            params: t.Object({
                uid: t.String(),
            }),
        })


        app.post('/', async ({ body, status, params }) => {
            const { uid } = params;
            const data = body;
            if (!data.token) {
                return status(400, { message: "Push token is required" });
            }
            const today = new Date();
            try {
                const [notification] = await db.insert(userNotifications).values({
                    userId: uid,
                    ...data,
                    enabled: true,
                    created: today,
                }).onConflictDoUpdate({
                    target: [userNotifications.userId, userNotifications.deviceId],
                    set: {
                        updated: today,
                        lastSeen: today,
                        nativeToken: data.nativeToken,
                        token: data.token,
                        enabled: true,
                    },
                }).returning({
                    id: userNotifications.id,
                    userId: userNotifications.userId,
                    platform: userNotifications.platform,
                    deviceModelId: userNotifications.deviceModelId,
                    deviceName: userNotifications.deviceName,
                    enabled: userNotifications.enabled,
                    lastSeen: userNotifications.lastSeen,
                    created: userNotifications.created,
                    updated: userNotifications.updated,
                })
                return status(200, notification);
            } catch (error) {
                console.error(error);
                return status(500, { message: "Internal server error" });
            }
        }, {
            params: t.Object({
                uid: t.String(),
            }),
            body: t.Object({
                token: t.String(),
                deviceModelId: t.Union([t.String(), t.Null()]),
                deviceName: t.String(),
                deviceId: t.String(),
                platform: t.Union([t.Literal("ios"), t.Literal("android")]),
                nativeToken: t.Optional(t.Union([t.String(), t.Null()])),
            }),
        });

        app.patch('/:nid', async ({ body, status, params }) => {
            const { nid } = params;
            const updates = body;
            try {
                await db.update(userNotifications).set(updates).where(eq(userNotifications.id, nid));
                return status(200, { success: true });
            } catch (error) {
                console.error(error);
                return status(500, { message: "Internal server error" });
            }
        }, {
            params: t.Object({
                uid: t.String(),
                nid: t.String(),
            }),
            body: t.Object({
                nativeToken: t.Optional(t.String()),
                token: t.Optional(t.String()),
                deviceId: t.Optional(t.String()),
                enabled: t.Optional(t.Boolean()),
            }),
        });
        return app;
    })


    return app;
}