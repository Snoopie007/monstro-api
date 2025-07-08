import { db } from "@/db/db";
import { memberSubscriptions } from "@/db/schemas";
import { getStripeCustomer } from "@/libs/server/stripe";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { addDays, addMonths } from "date-fns";

type Params = {
    id: string;
    mid: string;
    sid: string;
}

export async function PUT(req: Request, props: { params: Promise<Params> }) {
    const params = await props.params;
    const { resumeDate, pause, resume } = await req.json();

    try {
        const sub = await db.query.memberSubscriptions.findFirst({
            where: (sub, { eq }) => eq(sub.id, params.sid),
        });

        if (!sub) {
            throw new Error("Subscription not found")
        }

        if (sub.status === "canceled") {
            throw new Error("Subscription is canceled")
        }

        const stripe = await getStripeCustomer(params);

        if (pause) {

            await stripe.updateSubscription(sub.stripeSubscriptionId!, {
                pause_collection: {
                    behavior: "void",
                    resumes_at: resumeDate ? Math.floor(new Date(resumeDate).getTime() / 1000) : undefined
                }
            });
            await db.update(memberSubscriptions).set({
                status: "paused",
                updated: new Date(),
            }).where(eq(memberSubscriptions.id, sub.id));


        }

        if (resume) {
            //TODO: Resume subscription
            await stripe.updateSubscription(sub.stripeSubscriptionId!, {
                pause_collection: ''
            });
            await db.update(memberSubscriptions).set({
                status: "active",
                updated: new Date(),
            }).where(eq(memberSubscriptions.id, sub.id));
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
    }
}

export async function PATCH(req: Request, props: { params: Promise<Params> }) {
    const params = await props.params;
    const updates = await req.json();

    try {

        const current = await db.query.memberSubscriptions.findFirst({
            where: (sub, { eq }) => eq(sub.id, params.sid),
            with: {
                plan: true
            }
        });


        if (!current) {
            throw new Error("No active subscription found")
        }

        const locationState = await db.query.locationState.findFirst({
            where: (locationState, { eq }) => eq(locationState.locationId, params.id)
        });

        if (!locationState) {
            throw new Error("No valid location found")
        }

        const endDate = updates.endAt ? new Date(updates.endAt) : undefined
        const trialEnd = updates.trialDays ? addDays(current.currentPeriodStart, updates.trialDays) : undefined
        const stripe = await getStripeCustomer(params);

        if (updates.paymentMethod === "card") {

            await stripe.updateSubscription(current.stripeSubscriptionId!, {
                billing_cycle_anchor: updates.reset ? 'now' : 'unchanged',
                default_payment_method: updates.paymentMethodId,
                ...(endDate && { cancel_at: Math.floor(endDate.getTime() / 1000) }),
                proration_behavior: updates.allowProration ? "create_prorations" : "none",
                ...(trialEnd && { trial_end: Math.floor(trialEnd.getTime() / 1000) }),
            });
        }


        const today = Date.now()
        await db.update(memberSubscriptions).set({
            ...(updates.reset && {
                currentPeriodStart: today,
                currentPeriodEnd: addMonths(today, 1),
            }),
            cancelAt: endDate,
            endedAt: endDate,
            trialEnd: trialEnd,
            paymentMethod: updates.paymentMethod,
        }).where(eq(memberSubscriptions.id, current.id));



        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
    }
}



export async function DELETE(req: Request, props: { params: Promise<Params> }) {
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


            await db
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