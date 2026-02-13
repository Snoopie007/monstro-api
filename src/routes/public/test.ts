import { Elysia, t } from "elysia";
import { testQueue } from "@/queues";
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
                const res = await stripe.createPaymentIntent(
                    "cus_TjU6Twx5tNTTLs",
                    1000,
                    "pm_1SzrBsEiUYeMOEsWYAMcyFeM"
                );
                return { ok: true, result: res };
            } catch (error: any) {
                if (
                    error instanceof Stripe.errors.StripeError ||
                    (error && error.type && error.message)
                ) {
                    switch (error.type) {
                        case "StripeCardError":
                            const lastPaymentError = error.payment_intent?.last_payment_error;
                            console.log(lastPaymentError);
                            console.log(error.code);
                            console.log(error.decline_code);
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