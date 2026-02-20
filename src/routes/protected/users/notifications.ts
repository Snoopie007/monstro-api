import { db } from "@/db/db";
import { Elysia, t } from "elysia";
import { userNotifications } from "subtrees/schemas";
import { eq } from "drizzle-orm";


export async function userNotificationRoutes(app: Elysia) {

    app.group('/notifications', (app) => {



        app.post('/', async ({ body, status, params }) => {
            const { uid } = params;
            const { deviceId, ...other } = body;

            const today = new Date();
            try {
                const [notification] = await db.insert(userNotifications).values({
                    id: deviceId,
                    userId: uid,
                    ...other,
                    created: today,
                }).onConflictDoUpdate({
                    target: [userNotifications.id],
                    set: {
                        updated: today,
                        lastSeen: today,
                        nativeToken: other.nativeToken,
                        token: other.token,
                        enabled: other.enabled,
                    },
                }).returning()
                if (!notification) {
                    return status(500, { message: "Failed to create notification" });
                }
                const { token, nativeToken, ...rest } = notification;
                return status(200, rest);
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
                enabled: t.Boolean(),
                platform: t.Union([t.Literal("ios"), t.Literal("android")]),
                nativeToken: t.Optional(t.Union([t.String(), t.Null()])),
            }),
        });

        app.get('/:nid', async ({ status, params }) => {
            const { nid } = params;
            try {
                const notification = await db.query.userNotifications.findFirst({
                    where: eq(userNotifications.id, nid),
                    columns: {
                        nativeToken: false,
                        token: false,
                    }
                });
                if (!notification) {
                    return status(404, { message: "Notification not found" });
                }
                return status(200, notification);
            } catch (error) {
                console.error(error);
                return status(500, { message: "Internal server error" });
            }
        }, {
            params: t.Object({
                nid: t.String(),
                uid: t.String(),
            }),
        })

        return app;
    })


    return app;
}