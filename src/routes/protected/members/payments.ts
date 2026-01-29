import { VendorStripePayments } from "@/libs/stripe";
import Elysia from "elysia";
import { db } from "@/db/db";
import { z } from "zod";
import { memberPaymentMethods, members, paymentMethods } from "@/db/schemas";
import type { PaymentType } from "@/types/DatabaseEnums";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";


const GetMPProps = {
    params: z.object({
        mid: z.string(),
    }),
};




const liveStripe = new VendorStripePayments();


export function memberPayments(app: Elysia) {
    app.group("/payments", (app) => {
        app.get("/", async ({ status, params }) => {
            const { mid } = params;
            try {
                const methods = await db.query.paymentMethods.findMany({
                    where: (paymentMethod, { eq }) => eq(paymentMethod.memberId, mid),
                    columns: {
                        fingerprint: false,
                    }
                })



                return status(200, methods)
            } catch (err) {
                console.log(err)
                return status(500, { error: err })
            }
        }, GetMPProps)

        app.delete("/", async ({ status, body, params }) => {


            const { paymentMethodId } = body;
            try {

                await liveStripe.detachPaymentMethod(paymentMethodId)
                await db.delete(paymentMethods).where(eq(paymentMethods.stripeId, paymentMethodId))

                return status(200, { message: "Payment method deleted" })
            } catch (err) {
                console.log(err)
                return status(500, { error: err })
            }
        }, {
            ...GetMPProps,
            body: z.object({
                paymentMethodId: z.string(),
            }),
        })

        app.group("/new", (app) => {
            app.post("/", async ({ status, body, params }) => {
                const { mid } = params;
                const { userAgent, secret, lid } = body;
                // const ip = headers['x-forwarded-for'] || headers['cf-connecting-ip'] || '127.0.0.1';
                const setupIntentId = secret.split('_secret_')[0];
                if (!setupIntentId) {
                    return status(400, { error: "Setup intent ID is required" })
                }
                try {
                    const member = await db.query.members.findFirst({
                        where: (member, { eq }) => eq(member.id, mid)
                    })

                    if (!member) {
                        return status(404, { error: "Member not found" })
                    }


                    const isTestMember = member.email === 'mtest@yahoo.com';
                    const stripe = new VendorStripePayments(isTestMember ? process.env.STRIPE_TEST_SECRET_KEY : undefined);



                    let stripeCustomerId = member.stripeCustomerId;
                    if (!stripeCustomerId) {
                        const newCustomer = await stripe.createCustomer({
                            email: member.email,
                            phone: member.phone,
                            firstName: member.firstName,
                            lastName: member.lastName,
                        }, undefined, {
                            memberId: mid,
                        });
                        await db.update(members).set({
                            stripeCustomerId: newCustomer.id,
                        }).where(eq(members.id, mid));
                        stripeCustomerId = newCustomer.id;
                    }


                    stripe.setCustomer(stripeCustomerId);
                    const setupIntent = await stripe.getSetupIntent(setupIntentId);


                    if (setupIntent.status === 'succeeded') {
                        // Save the payment method to your database
                        const paymentMethod = setupIntent.payment_method as Stripe.PaymentMethod;

                        const pm = await attachPaymentMethod(paymentMethod, mid);

                        if (lid && pm) {
                            await db.insert(memberPaymentMethods).values({
                                paymentMethodId: pm.id,
                                memberId: mid,
                                locationId: lid,
                            })
                        }
                        return status(200, pm);
                    } else {
                        return status(400, { error: 'Setup intent not succeeded' });
                    }

                } catch (err) {
                    console.log(err)
                    return status(500, { error: err })
                }
            }, {
                ...GetMPProps,
                body: z.object({
                    lid: z.string().optional(),
                    userAgent: z.string().optional(),
                    secret: z.string(),
                }),
            })
            app.get("/intent", async ({ status, params, query }) => {
                const { mid } = params;
                const { ephemeralKey } = query;
                try {
                    const member = await db.query.members.findFirst({
                        where: (member, { eq }) => eq(member.id, mid)
                    })

                    if (!member) {
                        throw new Error("Member not found")
                    }

                    const isTestMember = member.email === 'mtest@yahoo.com';
                    const stripe = new VendorStripePayments(isTestMember ? process.env.STRIPE_TEST_SECRET_KEY : undefined);

                    let stripeCustomerId = member.stripeCustomerId;
                    if (!stripeCustomerId) {
                        const newCustomer = await stripe.createCustomer({
                            email: member.email,
                            phone: member.phone,
                            firstName: member.firstName,
                            lastName: member.lastName,
                        }, undefined, {
                            memberId: mid,
                        });
                        await db.update(members).set({
                            stripeCustomerId: newCustomer.id,
                        }).where(eq(members.id, mid));
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
                ...GetMPProps,
                query: z.object({
                    ephemeralKey: z.boolean().optional().default(false),
                }),
            })
            return app;
        })
        return app;
    })
    return app;
}





async function attachPaymentMethod(paymentMethod: Stripe.PaymentMethod, mid: string, name?: string) {
    const { card, us_bank_account } = paymentMethod;
    let fingerprint = card?.fingerprint || us_bank_account?.fingerprint;

    if (!fingerprint) {
        console.error("Fingerprint is required");
        return;
    }
    const [newPaymentMethod] = await db.insert(paymentMethods).values({
        fingerprint: fingerprint,
        stripeId: paymentMethod.id,
        type: paymentMethod.type as PaymentType,
        card: card ? {
            brand: card.brand,
            last4: card.last4,
            expMonth: card.exp_month,
            expYear: card.exp_year,
        } : null,
        usBankAccount: us_bank_account ? {
            bankName: us_bank_account.bank_name,
            accountType: us_bank_account.account_type,
            last4: us_bank_account.last4,
        } : null,
        memberId: mid,
        metadata: {
            nameOnCard: name || undefined,
        },
    }).onConflictDoNothing({
        target: [paymentMethods.fingerprint, paymentMethods.memberId],
    }).returning();
    return newPaymentMethod;
}
