import { db } from "@/db/db";
import { Elysia, t } from "elysia";
import { and, eq } from "drizzle-orm";
import { MemberStripePayments } from "@/libs/stripe";
import type { PaymentMethod, PaymentType } from "@subtrees/types";
import { memberLocations } from "@subtrees/schemas";
import type Stripe from "stripe";
const GetMLPProps = {
    params: t.Object({
        mid: t.String(),
        lid: t.String(),
    }),
};



export function mlPaymentMethods(app: Elysia) {
    app.get("/methods", async ({ status, params }) => {
        const { mid, lid } = params;
        try {
            const ml = await db.query.memberLocations.findFirst({
                where: (memberLocation, { eq, and }) => and(
                    eq(memberLocation.memberId, mid),
                    eq(memberLocation.locationId, lid)
                ),
                columns: {
                    stripeCustomerId: true,
                },
            });
            if (!ml) {
                return status(404, { error: "Member location not found" });
            }

            if (!ml.stripeCustomerId) {
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

            const stripe = new MemberStripePayments(
                stripeIntegration.accountId,
                stripeIntegration.accessToken
            );
            stripe.setCustomer(ml.stripeCustomerId);


            const stripePaymentMethods = await stripe.getPaymentMethods();

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
                            usBankAccount: null,
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
                            card: null,
                        });
                    }
                });
            }


            return status(200, paymentMethods);
        } catch (err) {
            console.log(err);
            return status(500, { error: err });
        }
    }, GetMLPProps);
    app.delete("/methods/:pmId", async ({ status, params }) => {
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
    app.get("/methods/intent", async ({ status, params, query }) => {
        const { mid, lid } = params;
        const { ephemeralKey } = query;
        try {
            const ml = await db.query.memberLocations.findFirst({
                where: (memberLocation, { eq, and }) => and(
                    eq(memberLocation.memberId, mid),
                    eq(memberLocation.locationId, lid)
                ),
                columns: {
                    stripeCustomerId: true,
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

            const stripe = new MemberStripePayments(
                stripeIntegration.accountId,
                stripeIntegration.accessToken
            );
            let stripeCustomerId = ml.stripeCustomerId;
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
                    stripeCustomerId: newCustomer.id,
                }).where(and(
                    eq(memberLocations.memberId, mid),
                    eq(memberLocations.locationId, lid)
                ));
                stripeCustomerId = newCustomer.id;
            }

            stripe.setCustomer(stripeCustomerId);
            const setupIntent = await stripe.createSetupIntent();

            let ek = undefined;
            if (ephemeralKey) {
                const ephemeralKey = await stripe.createEphemeralKey();
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
    app.post("/methods", async ({ status, body, params }) => {
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
            const stripe = new MemberStripePayments(
                stripeIntegration.accountId,
                stripeIntegration.accessToken
            );


            const setupIntent = await stripe.getSetupIntent(setupIntentId);


            if (setupIntent.status === 'succeeded') {
                // Save the payment method to your database
                const paymentMethod = setupIntent.payment_method as Stripe.PaymentMethod;

                const mappedPaymentMethod: PaymentMethod = {
                    id: paymentMethod.id,
                    source: 'stripe',
                    type: paymentMethod.type as PaymentType,
                    isDefault: false,
                    card: null,
                    usBankAccount: null,
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
}