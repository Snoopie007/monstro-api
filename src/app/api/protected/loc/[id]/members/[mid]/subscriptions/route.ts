import { db } from "@/db/db";
import { memberInvoices, memberLocations, memberSubscriptions, transactions } from "@/db/schemas";
import { getStripeCustomer } from "@/libs/server/stripe";
import { calculateCurrentPeriodEnd, createInvoice, createSubscription } from "../../utils";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

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
                        program: true
                    }
                }
            }
        })



        return NextResponse.json(subscriptions, { status: 200 })
    } catch (err) {
        // console.log(err)
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

        let { newSubscription, newTransaction, newInvoice } = createSubscription({
            ...data,
            memberId: params.mid,
            locationId: params.id,
            trialDays
        }, plan)

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
        if (data.paymentMethod === "cash") {
            if (!newSubscription.cancelAt) {
                const newDraftInvoice = createInvoice(plan, {
                    memberId: params.mid,
                    locationId: params.id,
                    paymentMethod: "cash"
                });
                newDraftInvoice.forPeriodStart = newSubscription.currentPeriodEnd;
                newDraftInvoice.forPeriodEnd = calculateCurrentPeriodEnd(newSubscription.currentPeriodEnd, plan.interval!, plan.intervalThreshold!);
                const [{ invoiceId }] = await db.insert(memberInvoices).values({
                    ...newDraftInvoice,
                    memberSubscriptionId: sid
                }).returning({ invoiceId: memberInvoices.id });
            }
        }
        return NextResponse.json({ sid }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}
