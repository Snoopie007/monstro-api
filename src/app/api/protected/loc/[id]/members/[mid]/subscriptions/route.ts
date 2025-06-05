import { db } from "@/db/db";
import { memberInvoices, memberLocations, memberPlans, memberSubscriptions, transactions } from "@/db/schemas";
import { getStripeCustomer, MemberStripePayments } from "@/libs/server/stripe";
import { calculateCurrentPeriodEnd, createInvoice, createSubscription,createTransaction } from "../../utils";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { encodeId } from '@/libs/server/sqids'
import Stripe from "stripe";
import { MemberPlan, MemberSubscription } from "@/types";

interface SubscriptionUpdates {
  price?: number;
  name?: string;
  description?: string;
  cancelAtPeriodEnd?: boolean;

  metadata?: Record<string, any>;
}

export async function GET(req: Request, props: { params: Promise<{ id: number, mid: number }> }) {
    const params = await props.params;

    try {
        const subscriptions = await db.query.memberSubscriptions.findMany({
            where: (memberSubscriptions, { eq, and }) => and(
                eq(memberSubscriptions.memberId, params.mid),
                eq(memberSubscriptions.locationId, params.id)
            ),
            with: {
                plan: {
                    with: {
                        planPrograms: {
                            with: {
                                program: true
                            }
                        }
                    }
                }
            }
        })

        return NextResponse.json(subscriptions, { status: 200 })
    } catch (err) {
        return NextResponse.json({ error: err }, { status: 500 })
    }
}


export async function POST(req: Request, props: { params: Promise<{ id: number, mid: number }> }) {
    const params = await props.params;
    const { stripePaymentMethod, hasIncompletePlan, other, trialDays, ...data } = await req.json();
    try {
        const plan = await db.query.memberPlans.findFirst({
            where: (memberPlan, { eq }) => eq(memberPlan.id, data.memberPlanId)
        })

        if (!plan || !plan.stripePriceId) {
            return NextResponse.json({ error: "No valid plan not found" }, { status: 404 })
        }

        const locationState = await db.query.locationState.findFirst({
            where: (locationState, { eq }) => eq(locationState.locationId, params.id),
        })

        if (!locationState) {
            return NextResponse.json({ error: "No valid location not found" }, { status: 404 })
        }

        // Apply tax to the plan price
        const tax = Math.floor(plan.price * (locationState.taxRate / 10000))


        let { newSubscription, newTransaction, newInvoice } = createSubscription({
            ...data,
            memberId: params.mid,
            locationId: params.id,
            trialDays
        }, plan, tax)

        if (data.paymentMethod === "card") {
            const stripe = await getStripeCustomer(params)
            const settings = {
                cancelAt: newSubscription.cancelAt,
                trialEnd: newSubscription.trialEnd,
                paymentMethod: stripePaymentMethod.id,
                allowProration: data.allowProration,
                applicationFeePercent: locationState?.usagePercent,
                metadata: {
                    memberId: params.mid,
                    locationId: params.id
                },
            }

            const sub = await stripe.createSubscription(plan, newSubscription.currentPeriodStart, settings)
            if (!sub.id) {
                return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 })
            }

            newTransaction.metadata = {
                card: { brand: stripePaymentMethod.card?.brand, last4: stripePaymentMethod.card?.last4 }
            }
            newSubscription.stripeSubscriptionId = sub.id
        }

        if (data.paymentMethod !== "card") {
            newSubscription.status = "active"
            newTransaction.status = "paid"
            newInvoice.status = "paid"
        }


        const sid = await db.transaction(async (tx) => {
            const [{ sid }] = await tx.insert(memberSubscriptions).values({
                ...newSubscription
            }).returning({ sid: memberSubscriptions.id })
            const [{ invoiceId }] = await tx.insert(memberInvoices).values({
                ...newInvoice,
                memberSubscriptionId: sid
            }).returning({ invoiceId: memberInvoices.id });

            await tx.insert(transactions).values({
                ...newTransaction,
                invoiceId,
                subscriptionId: sid,
            });


            return sid
        })
        if (hasIncompletePlan) {
            await db.update(memberLocations).set({
                incompletePlan: null,
                status: "active",
            }).where(and(
                eq(memberLocations.memberId, params.mid),
                eq(memberLocations.locationId, params.id)
            ))
        }

        if (data.paymentMethod === "cash" && !newSubscription.cancelAt) {
            newInvoice.status = "draft"
            await db.insert(memberInvoices).values({
                ...newInvoice,
                memberSubscriptionId: sid
            }).returning({ invoiceId: memberInvoices.id });
        }

        return NextResponse.json({ sid }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

export async function PATCH(req: Request, props: { params: Promise<{ id: number, mid: number }> }) {
    const params = await props.params;
    const { planId, stripePaymentMethod, trialDays, allowProration, cancelAt, metadata, ...data } = await req.json();

    try {
        
        const existingSubscription = await db.query.memberSubscriptions.findFirst({
            where: (sub, { and, eq }) => and(
                eq(sub.memberId, params.mid),
                eq(sub.locationId, params.id),
                
            )
        });
        

        if (!existingSubscription || !existingSubscription.stripeSubscriptionId) {
            return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
        }

    
        const newPlan = await db.query.memberPlans.findFirst({
            where: (memberPlan, { eq }) => eq(memberPlan.id, planId)
        });


        if (!newPlan || !newPlan.stripePriceId) {
            return NextResponse.json({ error: "No valid plan found" }, { status: 404 });
        }


        const locationState = await db.query.locationState.findFirst({
            where: (locationState, { eq }) => eq(locationState.locationId, params.id)
        });

        if (!locationState) {
            return NextResponse.json({ error: "No valid location found" }, { status: 404 });
        }


        const tax = Math.floor(newPlan.price * (locationState.taxRate / 10000));

        // Initialize Stripe client
        const stripe = await getStripeCustomer(params);

        let stripeSubUpdate = false;
        const updates: Partial<MemberSubscription> = {};
        const stripeUpdateParams: Parameters<MemberStripePayments['updateSubscription']>[1] = {
            proration_behavior: allowProration ? 'create_prorations' : 'none',
            metadata: {
                memberId: params.mid.toString(),
                locationId: params.id.toString(),
                ...(metadata || {})
            },
        };

        if (existingSubscription.memberPlanId !== planId) {
            stripeSubUpdate = true;
            updates.memberPlanId = planId;
            stripeUpdateParams.price = newPlan.stripePriceId;
        }

        if (cancelAt !== undefined) {
            stripeSubUpdate = true;
            updates.cancelAt = cancelAt ? new Date(cancelAt) : null;
            stripeUpdateParams.cancel_at_period_end = !!cancelAt;
        }

        if (trialDays !== undefined) {
            stripeSubUpdate = true;
            const trialEnd = trialDays
                ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
                : null;
            updates.trialEnd = trialEnd;
        }

        if (stripePaymentMethod) {
            stripeSubUpdate = true;
            await stripe.updateCustomer({ default_source: stripePaymentMethod.id });
        }

        if (stripeSubUpdate) {
            await stripe.updateSubscription(existingSubscription.stripeSubscriptionId, stripeUpdateParams);

            await db.update(memberSubscriptions)
                .set(updates)
                .where(eq(memberSubscriptions.id, existingSubscription.id));
                
            const newInvoice = {
                ...createInvoice(newPlan, {
                    memberId: params.mid, locationId: params.id,
                    paymentMethod: "card"
                }, tax),
                memberSubscriptionId: existingSubscription.id,
                forPeriodStart: new Date(),
                forPeriodEnd: calculateCurrentPeriodEnd(new Date(), newPlan.interval!, newPlan.intervalThreshold!)
            };

            const [{ invoiceId }] = await db.insert(memberInvoices).values(newInvoice)
                .returning({ invoiceId: memberInvoices.id });

            await db.insert(transactions).values({
                ...createTransaction(newPlan, {
                    memberId: params.mid, locationId: params.id,
                    paymentMethod: "card"
                }, tax),
                invoiceId,
                subscriptionId: existingSubscription.id,
                metadata: stripePaymentMethod ? {
                    card: { brand: stripePaymentMethod.card?.brand, last4: stripePaymentMethod.card?.last4 }
                } : {}
            });
        }

        return NextResponse.json({ sid: existingSubscription.id }, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
    }
}
export async function DELETE(req: Request, props: { params: Promise<{ id: number, mid: number }> }) {
    const params = await props.params;
    const {
        subscriptionId,
        cancellationOption = 'now',
        customCancelDate,
        refundOption = 'none',
        refundAmount,
        refundReason = 'requested_by_customer',
        cancellationReason
    } = await req.json();

    
    try {
        // Input validation
        if (!['now', 'period_end', 'custom_date'].includes(cancellationOption)) {
            return NextResponse.json({ error: "Invalid cancellation option" }, { status: 400 });
        }

        if (cancellationOption === 'custom_date' && !customCancelDate) {
            return NextResponse.json({ error: "Custom date required" }, { status: 400 });
        }

        if (refundOption === 'partial' && (!refundAmount || isNaN(refundAmount) || refundAmount <= 0)) {
            return NextResponse.json({ error: "Valid positive refund amount required" }, { status: 400 });
        }

        // Verify subscription exists and belongs to member/location
        const subscription = await db.query.memberSubscriptions.findFirst({
            where: and(
                eq(memberSubscriptions.id, subscriptionId),
                eq(memberSubscriptions.memberId, params.mid),
                eq(memberSubscriptions.locationId, params.id)
            ),
            with: {
                plan: true,
                invoices: {
                    where: eq(memberInvoices.status, "paid"),
                    orderBy: (invoices, { desc }) => [desc(invoices.created)],
                    limit: 1
                }
            }
        });

        if (!subscription) {
            return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
        }

        if (subscription.status === 'canceled') {
            return NextResponse.json({ error: "Already canceled" }, { status: 400 });
        }

        // Determine cancellation timing
        let cancelAt: Date | null = null;
        let cancelAtPeriodEnd = false;
        let endedAt: Date | null = null;

        switch (cancellationOption) {
            case 'now':
                endedAt = new Date();
                break;
            case 'period_end':
                cancelAtPeriodEnd = true;
                cancelAt = subscription.currentPeriodEnd;
                break;
            case 'custom_date':
                cancelAt = new Date(customCancelDate);
                if (cancelAt <= new Date()) {
                    return NextResponse.json({ error: "Custom date must be future" }, { status: 400 });
                }
                if (cancelAt > subscription.currentPeriodEnd) {
                    return NextResponse.json({
                        error: "Cannot cancel beyond period end",
                        currentPeriodEnd: subscription.currentPeriodEnd
                    }, { status: 400 });
                }
                break;
        }

        // Initialize Stripe
        const stripe = await getStripeCustomer(params);
        let stripeResult = null;

        // Handle Stripe cancellation if exists
        if (subscription.stripeSubscriptionId) {
            try {
                if (cancellationOption === 'period_end') {
                    await stripe.updateSubscription(subscription.stripeSubscriptionId, {
                        cancel_at_period_end: true
                    });
                } else {
                    stripeResult = await stripe.cancelSubscription(
                        subscription.stripeSubscriptionId,
                        false // immediate cancellation
                    );
                }

                // Handle refund if applicable
                if (refundOption !== 'none' && subscription.paymentMethod === 'card' && subscription.invoices.length > 0) {
                    const latestInvoice = await stripe.getLatestInvoice();
                    if (latestInvoice.payment_intent) {
                        const refundParams: {
                            payment_intent: string;
                            amount?: number;
                            reason?: 'requested_by_customer' | 'duplicate' | 'fraudulent';
                            metadata?: Record<string, string>;
                        } = {
                            payment_intent: typeof latestInvoice.payment_intent === 'string'
                                ? latestInvoice.payment_intent
                                : latestInvoice.payment_intent?.id,
                            reason: refundReason,
                            metadata: {
                                subscription_id: subscription.stripeSubscriptionId,
                                associated_subscription: subscriptionId.toString(),
                                cancellation_type: cancellationOption
                            }
                        };

                        if (refundOption === 'partial') {
                            refundParams.amount = refundAmount;
                        }

                        stripeResult = await stripe.createRefund(refundParams);
                    }
                }
            } catch (stripeError) {
                console.error("Stripe cancellation failed:", stripeError);
                // Continue with local cancellation even if Stripe fails
            }
        }

        // Update database
        const updatedSub = await db.update(memberSubscriptions)
            .set({
                status: 'canceled',
                cancelAt: cancelAt || new Date(),
                cancelAtPeriodEnd,
                endedAt: endedAt || (cancellationOption === 'now' ? new Date() : null),
                metadata: {
                    ...(subscription.metadata || {}),
                    cancellation: {
                        reason: cancellationReason,
                        option: cancellationOption,
                        processedAt: new Date().toISOString(),
                        refund: refundOption !== 'none' ? {
                            option: refundOption,
                            amount: refundAmount,
                            reason: refundReason,
                            stripeId: stripeResult?.id
                        } : undefined
                    }
                },
                updated: new Date()
            })
            .where(eq(memberSubscriptions.id, subscriptionId))
            .returning();

        return NextResponse.json({
            success: true,
            subscription: updatedSub[0],
            refund: stripeResult && stripeResult.object === 'refund' ? {
                id: stripeResult.id,
                amount: stripeResult.amount,
                status: stripeResult.status
            } : null,
            cancellation: {
                type: cancellationOption,
                effective_date: cancelAtPeriodEnd ? subscription.currentPeriodEnd : new Date(),
                at_period_end: cancelAtPeriodEnd
            }
        });
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