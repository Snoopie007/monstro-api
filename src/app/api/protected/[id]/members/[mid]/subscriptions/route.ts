import { db } from "@/db/db";
import { memberInvoices, memberSubscriptions, transactions } from "@/db/schemas";
import { getStripeCustomer } from "@/libs/server/stripe";
import { calculateCurrentPeriodEnd, createInvoice } from "@/libs/utils";
import { MemberSubscription } from "@/types";
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
    const { paymentMethod, ...data } = await req.json();

    const today = new Date();
    const startDate = new Date(data.startDate);
    const endDate = data.endDate ? new Date(data.endDate) : undefined;


    let newTransaction = {
        memberId: params.mid,
        locationId: params.id,
        chargeDate: today,
        status: "incomplete",
        transactionType: "incoming",
        paymentMethod: data.paymentType,
        ...(paymentMethod && { metadata: { card: { brand: paymentMethod.card?.brand, last4: paymentMethod.card?.last4 } } }),
        created: today,
    };

    try {
        const plan = await db.query.memberPlans.findFirst({
            where: (memberPlan, { eq }) => eq(memberPlan.id, data.memberPlanId)
        })

        if (!plan || !plan.stripePriceId) {
            return NextResponse.json({ error: "No valid plan not found" }, { status: 404 })
        }

        let newSubscription: MemberSubscription = {
            payerId: params.mid,
            beneficiaryId: data.beneficiaryId,
            locationId: params.id,
            planId: data.memberPlanId,
            startDate,
            currentPeriodStart: startDate,
            currentPeriodEnd: calculateCurrentPeriodEnd(startDate, plan),
            paymentType: data.paymentType,
            status: "incomplete",
            created: today,
        }

        const locationState = await db.query.locationState.findFirst({
            where: (locationState, { eq }) => eq(locationState.locationId, params.id),
        })

        if (data.paymentType === "card") {
            const stripe = await getStripeCustomer(params)
            const settings = {
                priceId: plan.stripePriceId,
                startDate,
                endDate,
                trialDays: data.trialDays,
                paymentMethod: paymentMethod.id,
                metadata: {
                    memberId: params.mid,
                    locationId: params.id
                },
            }
            let sub: Stripe.Subscription | Stripe.SubscriptionSchedule;
            if (isAfter(startDate, today) && !data.allowProration) {
                sub = await stripe.createSubSchedule(settings)
                newSubscription = {
                    ...newSubscription,
                    stripeSubscriptionId: sub.id,
                }
            } else {
                sub = await stripe.createSubscription(settings)
                newSubscription = {
                    ...newSubscription,
                    currentPeriodStart: new Date(sub.current_period_start * 1000),
                    currentPeriodEnd: new Date(sub.current_period_end * 1000),
                    stripeSubscriptionId: sub.id,
                }
            }
        }


        // Create invoice
        await db.transaction(async (tx) => {
            const [{ sid }] = await tx.insert(memberSubscriptions).values({
                ...newSubscription,
                status: "active",
            }).returning({ sid: memberSubscriptions.id })
            const [{ invoiceId }] = await tx.insert(memberInvoices)
                .values({
                    ...createInvoice(params, [plan], { tax: 0, discount: 0 }),
                    memberSubscriptionId: sid,
                })
                .returning({ invoiceId: memberInvoices.id })
            const transaction = await tx.insert(transactions).values({
                ...newTransaction,
                invoiceId,

            })
            // Add to reservation
        })

        if (data.paymentType === "cash") {
            // add schedule hook
        }
        return NextResponse.json({ success: true }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}





