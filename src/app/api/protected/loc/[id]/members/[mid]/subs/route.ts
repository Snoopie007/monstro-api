import { db } from "@/db/db";
import { memberInvoices, memberLocations, memberSubscriptions, transactions } from "@/db/schemas";
import { getStripeCustomer } from "@/libs/server/stripe";
import { createSubscription } from "../../utils";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { MemberSubscription } from "@/types";
import { addDays, addMonths } from "date-fns";
import Stripe from "stripe";
import { evaluateTriggers } from "@/libs/achievements";


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



        const plan = await db.query.memberPlans.findFirst({
            where: (memberPlan, { eq }) => eq(memberPlan.id, data.memberPlanId)
        })

        if (!plan) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 })
        }

        if (data.paymentMethod === "card" && !plan.stripePriceId) {
            return NextResponse.json({ error: "This plan cannot be purchased with card payment. Please contact the location to set up Stripe integration or use a different payment method" }, { status: 400 })
        }

        const locationState = await db.query.locationState.findFirst({
            where: (locationState, { eq }) => eq(locationState.locationId, params.id),
        })

        if (!locationState) {
            return NextResponse.json({ error: "No valid location not found" }, { status: 404 })
        }

        // Apply tax to the plan price
        const tax = Math.floor(plan.price * (locationState.taxRate / 10000))

        const { newSubscription, newInvoice, newTransaction } = createSubscription({
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
                // Invoice starts as DRAFT
                const [{ invoiceId }] = await tx.insert(memberInvoices).values({
                    ...newInvoice,
                    status: "draft",
                    paymentMethod: "manual",
                    invoiceType: "recurring",
                    memberSubscriptionId: sub.id
                }).returning({ invoiceId: memberInvoices.id });
                
                // Transaction created as incomplete
                await tx.insert(transactions).values({
                    ...newTransaction,
                    invoiceId,
                    subscriptionId: sub.id,
                    status: "incomplete",
                    paymentMethod: "cash",
                });
            }
            return sub
        })
        if (data.paymentMethod !== "card") {
            try {
                await evaluateTriggers({
                    memberId: params.mid,
                    locationId: params.id,
                    triggerType: 'plan_signup',
                    data: { memberPlanId: sub.memberPlanId }
                });
            } catch (error) {
                console.error('Error evaluating plan signup triggers:', error);
                // Don't fail the request if trigger evaluation fails
            }
        }
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




