import { db } from "@/db/db";
import { memberInvoices, memberLocations, memberSubscriptions, transactions } from "@/db/schemas";
import { getStripeCustomer, MemberStripePayments } from "@/libs/server/stripe";
import { calculateCurrentPeriodEnd, createInvoice, createSubscription, createTransaction } from "../../utils";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { MemberSubscription } from "@/types";
import { addDays, addMonths } from "date-fns";

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
    const updates = await req.json();

    try {

        const current = await db.query.memberSubscriptions.findFirst({
            where: (sub, { and, eq }) => and(
                eq(sub.memberId, params.mid),
                eq(sub.locationId, params.id),
            ),
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
            return NextResponse.json({ error: "No valid location found" }, { status: 404 });
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

