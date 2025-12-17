import { VendorStripePayments } from "@/libs/stripe";
import Elysia from "elysia";
import { db } from "@/db/db";
import { z } from "zod";
import { paymentMethods } from "@/db/schemas";
import type { PaymentType } from "@/types/DatabaseEnums";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";


const GetMPProps = {
    params: z.object({
        mid: z.string(),
    }),
};


const NewCardProps = {
    ...GetMPProps,
    body: z.object({
        token: z.string(),
        nameOnCard: z.string().optional(),
        address: z.object({
            line1: z.string(),
            city: z.string(),
            state: z.string(),
            postalCode: z.string(),
        }),
    }),
};


const liveStripe = new VendorStripePayments();


export function memberPayments(app: Elysia) {
    app.get("/payments", async ({ status, params }) => {
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
    app.delete("/payments", async ({ status, body, params }) => {

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


    app.group("/payments/card", (app) => {
        app.post("/", async ({ status, body, params }) => {
            const { mid } = params;

            const { token, nameOnCard } = body;

            try {
                const member = await db.query.members.findFirst({
                    where: (member, { eq }) => eq(member.id, mid)
                })

                if (!member || !member.stripeCustomerId) {
                    return status(404, { error: "Member not found" })
                }

                const isTestMember = member.email === 'mtest@yahoo.com';
                const stripe = new VendorStripePayments(isTestMember ? process.env.STRIPE_TEST_SECRET_KEY : undefined);
                stripe.setCustomer(member.stripeCustomerId);

                const { paymentMethod } = await stripe.setupIntent(token);
                const pm = await attachPaymentMethod(paymentMethod, mid, nameOnCard);

                return status(200, pm)

            } catch (err) {
                console.log(err)
                return status(500, { error: err })
            }
        }, NewCardProps)
        return app;
    })
    app.group("/payments/bank", (app) => {
        app.post("/", async ({ status, params, body, headers }) => {
            const { mid } = params;
            const { setupIntentId, userAgent } = body;
            const ip = headers['x-forwarded-for'] || headers['cf-connecting-ip'] || '127.0.0.1';
            try {
                const stripe = await getStripeCustomer(mid);
                const setupIntent = await stripe.confirmSetupIntent(setupIntentId, {
                    ip,
                    userAgent: userAgent,
                    acceptedAt: new Date().getTime(),
                });

                if (setupIntent.status === 'succeeded') {
                    // Save the payment method to your database
                    const paymentMethod = setupIntent.payment_method as Stripe.PaymentMethod;

                    const pm = await attachPaymentMethod(paymentMethod, mid);

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
                userAgent: z.string(),
                setupIntentId: z.string(),
            }),
        })
        app.post("/intent", async ({ status, params }) => {
            const { mid } = params;
            try {
                const stripe = await getStripeCustomer(mid);
                const setupIntent = await stripe.createBankSetupIntent();


                return status(200, {
                    clientSecret: setupIntent.client_secret,
                })
            } catch (err) {
                console.log(err)
                return status(500, { error: err })
            }
        }, GetMPProps)

        return app;
    })


    return app;
}


async function getStripeCustomer(mid: string) {
    const member = await db.query.members.findFirst({
        where: (member, { eq }) => eq(member.id, mid)
    })

    if (!member) {
        throw new Error("Member not found")
    }

    if (!member.stripeCustomerId) {
        throw new Error("Stripe Customer not found")
    }

    liveStripe.setCustomer(member.stripeCustomerId);
    return liveStripe;
}




async function attachPaymentMethod(paymentMethod: Stripe.PaymentMethod, mid: string, name?: string) {
    const { card, us_bank_account } = paymentMethod;
    let fingerprint = card?.fingerprint || us_bank_account?.fingerprint;

    if (!fingerprint) {
        console.error("Fingerprint is required");
        return;
    }
    // Check if the payment method already exists
    let pm = await db.query.paymentMethods.findFirst({
        where: (paymentMethod, { eq }) => eq(paymentMethod.fingerprint, fingerprint),
    });

    if (!pm) {

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
            target: [paymentMethods.fingerprint],
        }).returning();

        pm = newPaymentMethod;
    }

    return pm;
}
