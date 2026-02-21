import { Elysia, t } from "elysia";
import { paymentQueue, testQueue } from "@/queues";
import { MemberStripePayments } from "@/libs/stripe";
import { db } from "@/db/db";
import Stripe from "stripe";
import { sendNotifications } from "@/libs/expo";

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
        .post("/test",
            async ({ body, set }) => {
                const { subId } = body;


                try {
                    // const integration = await db.query.integrations.findFirst({
                    //     where: (integration, { eq, and }) =>
                    //         and(
                    //             eq(
                    //                 integration.locationId,
                    //                 "acc_BpT7jEb3Q16nOPL3vo7qlw"
                    //             ),
                    //             eq(integration.service, "stripe")
                    //         ),
                    // });
                    // if (!integration) {
                    //     set.status = 404;
                    //     return { error: "Integration not found" };
                    // }
                    // const stripe = new MemberStripePayments(integration.accountId);
                    // stripe.setCustomer("cus_TjU6Twx5tNTTLs");
                    // const res = await stripe.createPaymentIntent(
                    //     1000,
                    //     "pm_1SzrBsEiUYeMOEsWYAMcyFeM"
                    // );

                    return { ok: true, result: "test" };
                } catch (error: any) {
                    if (error instanceof Stripe.errors.StripeError) {
                        switch (error.type) {
                            case "StripeCardError":
                                const paymentIntent = error.payment_intent;
                                const lastError = paymentIntent?.last_payment_error;

                                await paymentQueue.add("retry:wallet", {
                                    paymentIntentId: paymentIntent?.id,
                                    attempts: 0,
                                    amount: paymentIntent?.amount,
                                    paymentMethodId: lastError?.payment_method?.id,
                                    lid: "acc_BpT7jEb3Q16nOPL3vo7qlw",
                                    walletId: "wal_1SzrBsEiUYeMOEsWYAMcyFeM",
                                }, {
                                    jobId: `retry:wallet:${paymentIntent?.id}`,
                                    delay: 2 * 60 * 1000,
                                    attempts: 8,
                                    backoff: {
                                        type: 'exponential',
                                        delay: 2 * 60 * 1000,
                                    },
                                    removeOnComplete: true,
                                    removeOnFail: true,
                                });
                                set.status = 400;
                                return { error: error.message };
                            case "StripeError":
                                set.status = 500;
                                return { error: error.message };
                            default:
                                set.status = 500;
                                return { error: "Internal server error" };
                        }
                    }
                    set.status = 500;
                    return { error: "Internal server error" };
                }
            },
            {
                body: t.Object({
                    subId: t.String(),
                }),
            }
        );
}