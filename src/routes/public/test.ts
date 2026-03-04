import { Elysia, t } from "elysia";
import { paymentQueue, testQueue } from "@/queues";
import { MemberStripePayments } from "@/libs/stripe";
import { db } from "@/db/db";
import Stripe from "stripe";
import { sendNotifications } from "@/libs/expo";
import { broadcastMessageUnread } from "@/libs/broadcast/messages";

const TEST_PUSH_TOKENS = [
    "ExponentPushToken[mRfnnIAg7baHwm4QgUH6Ay]",
    "ExponentPushToken[bBsoSMHiFy9hnQCXUJsqOq]",
];

export function testRoutes(app: Elysia) {
    return app
        // GET /public/test/push — send test push to TEST_PUSH_TOKENS (server must be running)
        .get("/test/push", async ({ set }) => {
            try {
                const messages = TEST_PUSH_TOKENS.map((to) => ({
                    to,
                    title: "Test notification",
                    body: "This is a test push from the server.",
                    data: { screen: "test" },
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
                const dummyMessage = {
                    id: "1234567890",
                    created: new Date(),
                    updated: new Date(),
                    chatId: "3534534",
                    senderId: userId,
                    replyId: null,
                    content: "test",
                };

                await broadcastMessageUnread("3534534", dummyMessage, [userId]);
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