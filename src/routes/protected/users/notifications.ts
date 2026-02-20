import { db } from "@/db/db";
import { Elysia, t } from "elysia";
import { userNotifications } from "subtrees/schemas";
import { eq } from "drizzle-orm";


export async function userNotificationRoutes(app: Elysia) {

    app.group('/notifications', (app) => {



        app.post('/', async ({ body, status, params }) => {
            const { uid } = params;


            const today = new Date();
            try {
                const [notification] = await db.insert(userNotifications).values({
                    userId: uid,
                    ...body,
                    created: today,
                }).onConflictDoUpdate({
                    target: [userNotifications.deviceId, userNotifications.userId],
                    set: {
                        updated: today,
                        lastSeen: today,
                        nativeToken: body.nativeToken,
                        token: body.token,
                        enabled: body.enabled,
                    },
                }).returning()
                if (!notification) {
                    return status(200, { enabled: false })
                }
                return status(200, { enabled: true });
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
                deviceId: t.String(),
                enabled: t.Boolean(),
                platform: t.Union([t.Literal("ios"), t.Literal("android")]),
                nativeToken: t.String(),
            }),
        });

        app.get('/:deviceId', async ({ status, params }) => {
            const { deviceId } = params;
            try {
                const userNotification = await db.query.userNotifications.findFirst({
                    where: eq(userNotifications.deviceId, deviceId),
                    columns: {
                        nativeToken: false,
                        token: false,
                    }
                });
                if (!userNotification) {
                    return status(200, { enabled: false });
                }
                return status(200, { enabled: true });
            } catch (error) {
                console.error(error);
                return status(500, { message: "Internal server error" });
            }
        }, {
            params: t.Object({
                deviceId: t.String(),
                uid: t.String(),
            }),
        })

        return app;
    })


    return app;
}