import { db } from "@/db/db";
import { memberInvoices, memberSubscriptions, transactions } from "@/db/schemas";
import { getStripeCustomer } from "@/libs/server/stripe";
import { createSubscription } from "../../utils";
import { isAfter } from "date-fns";

import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function GET(req: Request, props: { params: Promise<{ id: number, mid: number }> }) {
    const params = await props.params;

    try {
        const subscriptions = await db.query.memberSubscriptions.findMany({
            where: (memberSubscriptions, { eq, and }) => and(
                eq(memberSubscriptions.beneficiaryId, params.mid),
                eq(memberSubscriptions.locationId, params.id)
            ),
            with: {
                plan: {
                    with: {
                        program: true
                    }
                },
                payer: {
                    columns: {
                        id: true,
                        firstName: true,
                    }
                },
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
    const { stripePaymentMethod, other, trialDays, ...data } = await req.json();



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


        let { newSubscription, newTransaction, newInvoice } = createSubscription({ ...data, ...params, trialDays }, plan)

        let sub: Stripe.Subscription | Stripe.SubscriptionSchedule | undefined;
        if (data.paymentMethod === "card") {
            const stripe = await getStripeCustomer(params)
            const settings = {
                endDate: newSubscription.cancelAt,
                trialEnd: newSubscription.trialEnd,
                paymentMethod: stripePaymentMethod.id,
                applicationFeePercent: locationState?.usagePercent,
                metadata: {
                    memberId: params.mid,
                    locationId: params.id
                },
            }

            if (isAfter(newSubscription.currentPeriodStart, new Date()) && !data.allowProration) {
                sub = await stripe.createSubSchedule(plan.stripePriceId, newSubscription.currentPeriodStart, settings)
            } else {
                sub = await stripe.createSubscription(plan.stripePriceId, newSubscription.currentPeriodStart, settings)
            }

            if (sub.id) {
                newTransaction.metadata = {
                    card: { brand: stripePaymentMethod.card?.brand, last4: stripePaymentMethod.card?.last4 }
                }
                newSubscription.stripeSubscriptionId = sub.id
            }
        }

        if (data.paymentType !== "card" || sub && sub.id) {
            newSubscription.status = "active"
            newTransaction.status = "paid"
            newInvoice.status = "paid"
        }

        // Create invoice
        await db.transaction(async (tx) => {
            const [{ sid }] = await tx.insert(memberSubscriptions).values({
                ...newSubscription
            }).returning({ sid: memberSubscriptions.id })
            const [{ invoiceId }] = await tx.insert(memberInvoices).values({
                ...newInvoice,
                memberSubscriptionId: sid,
            }).returning({ invoiceId: memberInvoices.id });

            const transaction = await tx.insert(transactions).values({
                ...newTransaction,
                invoiceId,
                subscriptionId: sid,
            })

        })

        if (data.paymentType === "cash") {
            // to check if there is the end period has increased
            // it means the vendor has accepted a payment end period
            // then not then need to mark the create invoice mark as draft
            // that invoice will be for the next period
            // forPeriod Start and forPeriodEnd
            // add schedule hook.
        }
        return NextResponse.json({ id: newSubscription.id }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}
