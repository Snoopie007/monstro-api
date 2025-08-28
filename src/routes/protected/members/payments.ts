import { VendorStripePayments } from "@/libs/stripe";
import Elysia from "elysia";
import { db } from "@/db/db";



const liveStripe = new VendorStripePayments();


export function memberPayments(app: Elysia) {
    return app.get("/payments", async ({ status, params }) => {
        const { mid } = params as { mid: string };
        try {
            const member = await db.query.members.findFirst({
                where: (member, { eq }) => eq(member.id, mid)
            })

            if (!member || !member.stripeCustomerId) {
                return status(404, { error: "Member not found" })
            }

            const isTestMember = member.email === 'mtest@yahoo.com';

            const stripe = new VendorStripePayments(isTestMember ? process.env.STRIPE_TEST_SECRET_KEY : undefined);


            const stripeCustomer = await stripe.retrieveCustomer(member.stripeCustomerId);
            const defaultPaymentMethod = stripeCustomer.default_source || stripeCustomer.invoice_settings.default_payment_method;
            if (!stripeCustomer) {
                return status(404, { error: "Stripe Customer not found" })
            }
            const paymentMethods = await stripe.getPaymentMethods(stripeCustomer.id);


            const methods = paymentMethods.data.map((method) => {
                const isDefault = method.id === defaultPaymentMethod;
                return {
                    ...method,
                    id: method.id,
                    brand: method.card?.brand,
                    last4: method.card?.last4,
                    isDefault
                }
            })

            return status(200, methods)
        } catch (err) {
            console.log(err)
            return status(500, { error: err })
        }
    }).post("/payments", async ({ status, body, params }) => {

        const { token, default: isDefault } = body as { token: string, default: boolean };

        try {

            const stripe = await getStripeCustomer(params as { lid: string, mid: string });
            const { paymentMethod } = await stripe.setupIntent(token);
            if (isDefault) {
                await stripe.updateCustomer({ invoice_settings: { default_payment_method: paymentMethod?.id } })
            }
            return status(200, paymentMethod)

        } catch (err) {
            console.log(err)
            return status(500, { error: err })
        }
    }).delete("/payments", async ({ status, body, params }) => {

        const { paymentMethodId } = body as { paymentMethodId: string };

        try {

            await liveStripe.detachPaymentMethod(paymentMethodId)
            return status(200, { message: "Payment method deleted" })
        } catch (err) {
            console.log(err)
            return status(500, { error: err })
        }
    }).put("/payments/default", async ({ status, body, params }) => {
        const { paymentMethodId } = body as { paymentMethodId: string };
        const { mid } = params as { mid: string };

        try {

            const member = await db.query.members.findFirst({
                where: (member, { eq }) => eq(member.id, mid)
            })

            if (!member || !member.stripeCustomerId) {
                throw new Error("Member not found")
            }

            const isTestMember = member.email === 'mtest@yahoo.com';
            const stripe = new VendorStripePayments(isTestMember ? process.env.STRIPE_TEST_SECRET_KEY : undefined);
            stripe.setCustomer(member.stripeCustomerId);


            await stripe.setDefaultPaymentMethod(paymentMethodId);

            return status(200, { success: true })

        } catch (err) {
            console.log(err)
            return status(500, { error: err })
        }
    })
}


async function getStripeCustomer(params: { lid: string, mid: string }) {
    const member = await db.query.members.findFirst({
        where: (member, { eq }) => eq(member.id, params.mid)
    })

    if (!member || !member.stripeCustomerId) {
        throw new Error("Member not found")
    }

    liveStripe.setCustomer(member.stripeCustomerId);
    return liveStripe;
}