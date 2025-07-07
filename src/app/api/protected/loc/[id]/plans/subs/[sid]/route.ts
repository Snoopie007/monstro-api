import { NextRequest, NextResponse } from "next/server";
import { decode, getToken } from "next-auth/jwt";
import { jwtVerify, decodeJwt } from 'jose';
import { auth } from "@/auth";
import { db } from "@/db/db";
import { getStripeCustomer, MemberStripePayments } from "@/libs/server/stripe";
import Stripe from "stripe";
import { memberSubscriptions } from "@/db/schemas";
import { eq } from "drizzle-orm";

type Params = {
    id: string;
    sid: string;
}

const isProduction = process.env.NODE_ENV === 'production';

export async function PATCH(req: NextRequest, props: { params: Promise<Params> }) {
    const { id, sid } = await props.params;
    const body = await req.json();
    console.log(body);

    try {

        const sub = await db.query.memberSubscriptions.findFirst({
            where: (ms, { eq }) => eq(ms.id, sid),
        })

        if (!sub) {
            return NextResponse.json({ success: false, message: 'Subscription not found' }, { status: 404 });
        }

        const member = await db.query.members.findFirst({
            where: (m, { eq }) => eq(m.id, sub.memberId)
        })

        if (sub.stripeSubscriptionId) {

            const stripe = new MemberStripePayments()
            stripe.setCustomer(member?.stripeCustomerId || '')
            const subscription = await stripe.getSubscription(sub.stripeSubscriptionId)
            const latestInvoice = subscription.latest_invoice as Stripe.Invoice
            let chargeId: string | undefined;
            const payment = latestInvoice.payments?.data[0].payment as Stripe.InvoicePayment.Payment

            if (payment && payment?.type === 'payment_intent') {
                const paymentIntent = await stripe.getPaymentIntent(payment.payment_intent as string)

                chargeId = paymentIntent.latest_charge as string || undefined
            } else {
                chargeId = payment?.charge as string || undefined
            }
            console.log(chargeId);
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}


export async function DELETE(req: Request, props: { params: Promise<{ id: string, sid: string }> }) {
    const { id, sid } = await props.params;
    const { cancelOption, customDate, refundAmount, reason } = await req.json();

    // Input validation
    if (!['now', 'end', 'custom'].includes(cancelOption)) {
        throw new Error("Invalid cancellation option");
    }

    if (cancelOption === 'custom' && !customDate) {
        throw new Error("Custom date required");
    }

    try {
        const subscription = await db.query.memberSubscriptions.findFirst({
            where: (ms, { eq }) => eq(ms.id, sid),
            with: {
                plan: true,
                invoices: {
                    where: (mi, { eq }) => eq(mi.status, "paid"),
                    orderBy: (invoices, { desc }) => [desc(invoices.created)],
                    limit: 1
                }
            }
        });

        if (!subscription) {
            throw new Error("Subscription not found");
        }

        if (subscription.status === 'canceled') {
            throw new Error("Already canceled");
        }

        // Initialize Stripe
        const stripe = await getStripeCustomer({ id, mid: subscription.memberId });


        const cancelDate = cancelOption === 'end' ? subscription.currentPeriodEnd : customDate ? new Date(customDate) : new Date();

        if (subscription.stripeSubscriptionId) {
            await stripe.cancelSubscription(
                subscription.stripeSubscriptionId,
                cancelOption === 'end',
                cancelDate
            );

            if (refundAmount > 0) {

                const sub = await stripe.getSubscription(subscription.stripeSubscriptionId)
                const latestInvoice = sub.latest_invoice as Stripe.Invoice
                const payment = latestInvoice.payments?.data[0].payment as Stripe.InvoicePayment.Payment

                const isPaymentIntent = payment?.type === 'payment_intent'

                await stripe.createRefund({
                    ...(isPaymentIntent && { payment_intent: payment.payment_intent as string }),
                    ...(!isPaymentIntent && { charge: payment?.charge as string }),
                })
            }


            const updatedSub = await db
                .update(memberSubscriptions)
                .set({
                    status: 'canceled',
                    cancelAt: cancelDate,
                    cancelAtPeriodEnd: cancelOption === 'end',
                    endedAt: cancelDate,
                    metadata: {
                        ...(subscription.metadata || {}),
                        cancellation: {
                            reason,
                            option: cancelOption,
                            processedAt: new Date().toISOString(),
                            refund: refundAmount
                        }
                    },
                    updated: new Date()
                })
                .where(eq(memberSubscriptions.id, sid)).returning();

            return NextResponse.json({ success: true }, { status: 200 });
        }

        return NextResponse.json({ success: false, error: "No Stripe subscription found" }, { status: 400 });

    } catch (err) {
        console.error("Subscription cancellation error:", err);
        return NextResponse.json(
            {
                error: err instanceof Error ? err.message : "Cancellation failed",
                ...(process.env.NODE_ENV === 'development' ? {
                    stack: err instanceof Error ? err.stack : undefined
                } : {})
            },
            { status: 500 }
        );
    }
}