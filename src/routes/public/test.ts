import { Elysia, t } from "elysia";
import { sendNotifications } from "@/libs/expo";
import { SquarePaymentGateway } from "@/libs/PaymentGateway";
import { SquareError, type CreatePaymentResponse } from "square";

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
        .post("/test/square", async ({ body, set, status }) => {

            const square = new SquarePaymentGateway('EAAAl0X0euRh5YQiMD15NxkUmzyIwQ1cNsqkjCqEyuGjdvwUdjoLMttBo7SIhtlS');

            try {
                await square.createCharge('18WM5F8024S9H4QDJRZNPQ4ZW0', 'cnon:card-nonce-declined', {
                    total: 100000,
                    feesAmount: 1000,
                    currency: "USD",
                    note: "Test charge",
                    referenceId: "1234567890",
                    squareLocationId: "LY43BJ6XXMPAW",
                });
            } catch (e) {

                if (e instanceof SquareError) {
                    const body = e.body as CreatePaymentResponse | undefined;
                    if (body) {
                        status(500, { error: "Failed to create charge" });
                    }
                    const payment = body?.payment;
                    const errors = body?.errors;
                    console.log("payment", payment);
                    console.log("errors", errors);

                    return status(500, { error: "Failed to create charge" });
                }
                console.error(e);
            }
        });
}