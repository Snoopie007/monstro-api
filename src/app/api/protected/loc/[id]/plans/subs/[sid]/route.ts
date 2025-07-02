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
    // const token = await getToken({
    //     req,
    //     secret: process.env.AUTH_SECRET!,
    //     cookieName: "next-auth.session-token",
    //     salt: isProduction ? `__Secure-next-auth.monstro-session-token` : `next-auth.session-token`
    // });


    // const res = await jwtVerify(
    //     'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEiLCJuYW1lIjoiQnJpYW4gRGlleiIsImVtYWlsIjoidGVzdEBteW1vbnN0cm8uY29tIiwiZW1haWxWZXJpZmllZCI6bnVsbCwiaW1hZ2UiOm51bGwsInBhc3N3b3JkIjoiJDJhJDEwJGJoZ1RrSzAyNkh1MzZmSGEvMktSSk9lVmJxMUxDUnlZYWUwRGpRZEQ2aGtxdElGYzhGY0ZpIiwiY3JlYXRlZCI6IjIwMjUtMDMtMTVUMTU6NTA6MjkuODA3WiIsInVwZGF0ZWQiOm51bGwsImRlbGV0ZWQiOm51bGwsInZlbmRvciI6eyJpZCI6MSwicGhvbmUiOiIrMTUxNjQxODI2NTkiLCJhdmF0YXIiOm51bGwsInN0cmlwZUN1c3RvbWVySWQiOiJjdXNfUnpGR2MxY2FvM2w5Q1EiLCJsb2NhdGlvbnMiOlt7ImlkIjozMCwibmFtZSI6IkdyYWNpZSBNYW5zaW9uIENvbnNlcnZhbmN5IiwibG9jYXRpb25TdGF0ZSI6eyJzdGF0dXMiOiJpbmNvbXBsZXRlIn19LHsiaWQiOjIsIm5hbWUiOiJNYXJ0aWFsIEFydHMgVVNBIiwibG9jYXRpb25TdGF0ZSI6eyJzdGF0dXMiOiJhY3RpdmUifX0seyJpZCI6MjksIm5hbWUiOiJTb3V0aCBUdWxzYSBDaGlsZHJlbnMgQmFsbGV0IiwibG9jYXRpb25TdGF0ZSI6eyJzdGF0dXMiOiJhY3RpdmUifX0seyJpZCI6MTgsIm5hbWUiOiJNYXJ0aWFsIEFydHMgQWR2YW50YWdlIiwibG9jYXRpb25TdGF0ZSI6eyJzdGF0dXMiOiJhY3RpdmUifX1dfSwiZXhwIjoxNzUxMDUyNzU2LCJpYXQiOjE3NTA5NjYzNTZ9.F10jlI7vqsU9PB4DzDlRbyqucsqy1Qxu7MzhnAbRsFI',
    //     new TextEncoder().encode(process.env.AUTH_SECRET),
    //     {
    //         algorithms: ['HS256'],
    //     }
    // )
    // const tt = await decode({
    //     token: token,
    //     secret: process.env.AUTH_SECRET,
    //     salt: isProduction ? `__Secure - next - auth.monstro - session - token` : `next - auth.session - token`,
    // })
    // console.log('Next Decode', token);
    // console.log(res);
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