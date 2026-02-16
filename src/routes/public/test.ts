import { Elysia, t } from "elysia";
import { paymentQueue, testQueue } from "@/queues";
import { MemberStripePayments } from "@/libs/stripe";
import { db } from "@/db/db";
import Stripe from "stripe";

export function testRoutes(app: Elysia) {
    return app.post(
        "/test",
        async ({ body, set }) => {
            const { subId } = body;


            try {
                const integration = await db.query.integrations.findFirst({
                    where: (integration, { eq, and }) =>
                        and(
                            eq(
                                integration.locationId,
                                "acc_BpT7jEb3Q16nOPL3vo7qlw"
                            ),
                            eq(integration.service, "stripe")
                        ),
                });
                if (!integration) {
                    set.status = 404;
                    return { error: "Integration not found" };
                }
                const stripe = new MemberStripePayments(integration.accountId);
                stripe.setCustomer("cus_TjU6Twx5tNTTLs");
                const res = await stripe.createPaymentIntent(
                    1000,
                    "pm_1SzrBsEiUYeMOEsWYAMcyFeM"
                );

                return { ok: true, result: res };
            } catch (error: any) {
                if (error instanceof Stripe.errors.StripeError) {
                    switch (error.type) {
                        case "StripeCardError":
                            const paymentIntent = error.payment_intent;
                            const lastError = paymentIntent?.last_payment_error;
                            console.log(error.code);
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