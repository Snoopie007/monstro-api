import { db } from "@/db/db";
import { memberInvoices, memberLocations, memberSubscriptions, transactions } from "@/db/schemas";
import { getStripeCustomer, MemberStripePayments } from "@/libs/server/stripe";
import { calculateCurrentPeriodEnd, createInvoice, createSubscription, createTransaction } from "../../utils";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { MemberSubscription } from "@/types";

interface SubscriptionUpdates {
    price?: number;
    name?: string;
    description?: string;
    cancelAtPeriodEnd?: boolean;

    metadata?: Record<string, any>;
}

export async function GET(req: Request, props: { params: Promise<{ id: string, mid: string }> }) {
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


export async function POST(req: Request, props: { params: Promise<{ id: string, mid: string }> }) {
    const params = await props.params;
    const { stripePaymentMethod, hasIncompletePlan, other, trialDays, ...data } = await req.json();
    try {

        const integration = await db.query.integrations.findFirst({
            where: (integration, { eq, and }) => and(
                eq(integration.locationId, params.id),
                eq(integration.service, "stripe")
            )
        })

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

        let { newSubscription, newInvoice, newTransaction } = createSubscription({
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

            newSubscription.stripeSubscriptionId = sub.id
        }

        if (data.paymentMethod !== "card") {
            newSubscription.status = "active"
        }


        const sub = await db.transaction(async (tx) => {
            const [sub] = await tx.insert(memberSubscriptions).values({
                ...newSubscription
            }).returning()


            if (data.paymentMethod === "cash") {

                const [{ invoiceId }] = await tx.insert(memberInvoices).values({
                    ...newInvoice,
                    status: "draft",
                    memberSubscriptionId: sub.id
                }).returning({ invoiceId: memberInvoices.id });
                await tx.insert(transactions).values({
                    ...newTransaction,
                    invoiceId,
                    subscriptionId: sub.id,
                    status: "paid",
                });
            }
            return sub
        })
        if (hasIncompletePlan) {
            await db.update(memberLocations).set({
                status: "active",
            }).where(and(
                eq(memberLocations.memberId, params.mid),
                eq(memberLocations.locationId, params.id)
            ))
        }

        return NextResponse.json({
            ...sub,
            plan: plan,
        } as MemberSubscription, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}



export async function PATCH(req: Request, props: { params: Promise<{ id: string, mid: string }> }) {
    const params = await props.params;
    const { planId, stripePaymentMethod, trialDays, allowProration, cancelAt, metadata, ...data } = await req.json();
    console.log("Updating subscription for member:", params.mid, "at location:", params.id, "with data:", data, "and plan:", planId, "allowProration:", allowProration, "cancelAt:", cancelAt, "trialDays:", trialDays, "metadata:", metadata);

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

