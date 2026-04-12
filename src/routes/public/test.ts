import { Elysia, t } from "elysia";
import { sendNotifications } from "@/libs/expo";

const TEST_PUSH_TOKENS = [
    "ExponentPushToken[mRfnnIAg7baHwm4QgUH6Ay]",
    "ExponentPushToken[bBsoSMHiFy9hnQCXUJsqOq]",
    "ExponentPushToken[2bGQf-OeaQYLnnvo-iGjH5]",
];

export function testRoutes(app: Elysia) {
    return app
        // GET /public/test/push — send test push to TEST_PUSH_TOKENS (server must be running)
        .post("/test/push", async ({ set }) => {
            try {
                const messages = TEST_PUSH_TOKENS.map((to) => ({
                    to,
                    title: "Allen Mayorga",
                    body: "New message from Allen Mayorga",
                    icon: "https://avatars.githubusercontent.com/u/26342387?v=4",
                    channelId: "default",
                    categoryId: "message",
                    richContent: {
                        image: "https://avatars.githubusercontent.com/u/26342387?v=4",
                    },
                    data: { screen: "messages", messageId: "1234567890", chatId: "3534534" },
                }));
                const tickets = await sendNotifications(messages);
                return { ok: true, tickets, sent: tickets.length };
            } catch (error: any) {
                console.error(error);
                set.status = 500;
                return { ok: false, error: error?.message ?? "Failed to send test push" };
            }
        })
        .post("/test", async ({ body, set }) => {
            const userId = "usr_WL6ZRTHNTwe63G2RMYU0Xw";
            try {
                const achievement = {
                    id: "1234567890",
                    name: "test",
                    description: "test",
                    points: 100,
                    badge: "https://png.pngtree.com/png-vector/20240115/ourmid/pngtree-achievement-badge-png-image_11439954.png",
                };

                return { ok: true, result: "test" };
            } catch (error: any) {
                console.error(error);
                set.status = 500;
                return {
                    ok: false,
                    error: error?.message ?? "Failed to send test push",
                };
            }
        });
}