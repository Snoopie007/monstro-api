import { db } from "@/db/db";
import { Elysia, t } from "elysia";
import { and, eq } from "drizzle-orm";
import type { PaymentMethod, PaymentType } from "@subtrees/types";
import { memberLocations } from "@subtrees/schemas";
import type Stripe from "stripe";
import { StripePaymentGateway } from "@/libs/PaymentGateway";
const SharedProps = {
    params: t.Object({
        mid: t.String(),
        lid: t.String(),
    }),
};


export function StripePaymentMethodsRoutes(app: Elysia) {
    app.group('/stripe', (app) => {
        app.get("/", async ({ status, params }) => {
            const { mid, lid } = params;
            try {
                const ml = await db.query.memberLocations.findFirst({
                    where: (memberLocation, { eq, and }) => and(
                        eq(memberLocation.memberId, mid),
                        eq(memberLocation.locationId, lid)
                    ),
                    columns: {
                        gatewayCustomerId: true,
                    },
                });
                if (!ml) {
                    return status(404, { error: "Member location not found" });
                }

                if (!ml.gatewayCustomerId) {
                    return status(404, { error: "Stripe customer not found" });
                }

                const stripeIntegration = await db.query.integrations.findFirst({
                    where: (integration, { eq, and }) => and(
                        eq(integration.locationId, lid),
                        eq(integration.service, "stripe")
                    ),
                    columns: {
                        accountId: true,
                        accessToken: true,
                    },
                });


                if (!stripeIntegration || !stripeIntegration.accountId || !stripeIntegration.accessToken) {
                    return status(404, { error: "Stripe integration not found" });
                }

                const stripe = new StripePaymentGateway(stripeIntegration.accessToken);

                const stripePaymentMethods = await stripe.getPaymentMethods(ml.gatewayCustomerId);

                let paymentMethods: PaymentMethod[] = [];
                if (stripePaymentMethods.length > 0) {
                    stripePaymentMethods.forEach(method => {
                        // Ensure all required PaymentMethod fields are present and not undefined
                        if (!method.id) return; // skip if no id; shouldn't happen but for type safety
                        if (method.type === 'card' && method.card) {
                            const card = method.card;
                            paymentMethods.push({
                                id: method.id,
                                source: 'stripe',
                                type: method.type as PaymentType,
                                isDefault: false,
                                card: {
                                    brand: card.brand,
                                    last4: card.last4,
                                    expMonth: card.exp_month,
                                    expYear: card.exp_year,
                                },
                                usBankAccount: undefined,
                            });
                        } else if (method.type === 'us_bank_account' && method.us_bank_account) {
                            const bank = method.us_bank_account;
                            paymentMethods.push({
                                id: method.id,
                                source: 'stripe',
                                type: method.type as PaymentType,
                                isDefault: false,
                                usBankAccount: {
                                    bankName: bank.bank_name,
                                    last4: bank.last4,
                                    accountType: bank.account_type,
                                },
                                card: undefined,
                            });
                        }
                    });
                }


                return status(200, paymentMethods);
            } catch (err) {
                console.log(err);
                return status(500, { error: err });
            }
        }, SharedProps);
        app.delete("/:pmId", async ({ status, params }) => {
            const { mid, lid, pmId } = params;
            try {

                return status(200, { success: true });
            } catch (err) {
                console.log(err);
                return status(500, { error: err });
            }
        },
            {
                params: t.Object({
                    mid: t.String(),
                    lid: t.String(),
                    pmId: t.String(),
                }),
            }
        );
        app.get("/intent", async ({ status, params, query }) => {
            const { mid, lid } = params;
            const { ephemeralKey } = query;
            try {
                const ml = await db.query.memberLocations.findFirst({
                    where: (memberLocation, { eq, and }) => and(
                        eq(memberLocation.memberId, mid),
                        eq(memberLocation.locationId, lid)
                    ),
                    columns: {
                        gatewayCustomerId: true,
                    },
                    with: {
                        member: {
                            columns: {
                                email: true,
                                phone: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                });

                if (!ml) {
                    return status(404, { error: "Member location not found" })
                }
                const locationState = await db.query.locationState.findFirst({
                    where: (locationState, { eq }) => eq(locationState.locationId, lid),
                    columns: {
                        paymentGatewayId: true,
                    },
                });
                if (!locationState) {
                    return status(404, { error: "Location state not found" });
                }
                const paymentGatewayId = locationState.paymentGatewayId;
                if (!paymentGatewayId) {
                    return status(404, { error: "Payment gateway not found" });
                }
                const gateway = await db.query.integrations.findFirst({
                    where: (i, { eq }) => eq(i.id, paymentGatewayId),
                    columns: { accountId: true, accessToken: true },
                });

                if (!gateway || !gateway.accountId || !gateway.accessToken) {
                    return status(404, { error: "Stripe integration not found" });
                }

                const stripe = new StripePaymentGateway(gateway.accessToken);
                let stripeCustomerId = ml.gatewayCustomerId;
                if (!stripeCustomerId) {
                    const { member } = ml;
                    const newCustomer = await stripe.createCustomer({
                        email: member.email,
                        phone: member.phone,
                        firstName: member.firstName,
                        lastName: member.lastName,
                    }, undefined, {
                        memberId: mid,
                    });
                    await db.update(memberLocations).set({
                        gatewayCustomerId: newCustomer.id,
                    }).where(and(
                        eq(memberLocations.memberId, mid),
                        eq(memberLocations.locationId, lid)
                    ));
                    stripeCustomerId = newCustomer.id;
                }

                const setupIntent = await stripe.createSetupIntent(stripeCustomerId);

                let ek = undefined;
                if (ephemeralKey) {
                    const ephemeralKey = await stripe.createEphemeralKey(stripeCustomerId, gateway.accountId);

                    ek = ephemeralKey;
                }

                return status(200, {
                    customer: setupIntent.customer,
                    clientSecret: setupIntent.client_secret,
                    ephemeralKey: ek,
                })
            } catch (err) {
                console.log(err)
                return status(500, { error: err })
            }
        }, {
            params: t.Object({
                mid: t.String(),
                lid: t.String(),
            }),
            query: t.Object({
                ephemeralKey: t.Optional(t.Boolean()),
            }),
        })
        app.post("/", async ({ status, body, params }) => {
            const { mid, lid } = params;
            const { userAgent, secret } = body;
            // const ip = headers['x-forwarded-for'] || headers['cf-connecting-ip'] || '127.0.0.1';
            const setupIntentId = secret.split('_secret_')[0];
            if (!setupIntentId) {
                return status(400, { error: "Setup intent ID is required" })
            }
            try {

                const stripeIntegration = await db.query.integrations.findFirst({
                    where: (integration, { eq, and }) => and(
                        eq(integration.locationId, lid),
                        eq(integration.service, "stripe")
                    ),
                    columns: {
                        accountId: true,
                        accessToken: true,
                    },
                });

                if (!stripeIntegration || !stripeIntegration.accountId || !stripeIntegration.accessToken) {
                    return status(404, { error: "Stripe integration not found" });
                }

                // const isTestMember = member.email === 'mtest@yahoo.com';
                const stripe = new StripePaymentGateway(stripeIntegration.accessToken);


                const setupIntent = await stripe.getSetupIntent(setupIntentId);


                if (setupIntent.status === 'succeeded') {
                    // Save the payment method to your database
                    const paymentMethod = setupIntent.payment_method as Stripe.PaymentMethod;

                    const mappedPaymentMethod: PaymentMethod = {
                        id: paymentMethod.id,
                        source: 'stripe',
                        type: paymentMethod.type as PaymentType,
                        isDefault: false,
                        card: undefined,
                        usBankAccount: undefined,
                    };
                    if (paymentMethod.type === 'card' && paymentMethod.card) {
                        mappedPaymentMethod.card = {
                            brand: paymentMethod.card.brand,
                            last4: paymentMethod.card.last4,
                            expMonth: paymentMethod.card.exp_month,
                            expYear: paymentMethod.card.exp_year,
                        };
                    }
                    if (paymentMethod.type === 'us_bank_account' && paymentMethod.us_bank_account) {
                        mappedPaymentMethod.usBankAccount = {
                            bankName: paymentMethod.us_bank_account.bank_name,
                            last4: paymentMethod.us_bank_account.last4,
                            accountType: paymentMethod.us_bank_account.account_type,
                        };
                    }
                    return status(200, mappedPaymentMethod);
                } else {
                    return status(400, { error: 'Setup intent not succeeded' });
                }

            } catch (err) {
                console.log(err)
                return status(500, { error: err })
            }
        }, {
            params: t.Object({
                mid: t.String(),
                lid: t.String(),
            }),
            body: t.Object({
                userAgent: t.Optional(t.String()),
                secret: t.String(),
            }),
        })
        return app;
    })

    return app;
}