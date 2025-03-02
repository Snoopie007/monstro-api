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
            let sub: Stripe.Subscription | Stripe.SubscriptionSchedule;
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
                newSubscription.status = "active"
                newTransaction.status = "paid"
            }
        }


        // Create invoice
        await db.transaction(async (tx) => {
            const [{ sid }] = await tx.insert(memberSubscriptions).values({
                ...newSubscription,
                status: "active",
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


// type SubscriptionData = {
//     mid: number;
//     id: number;
//     memberPlanId: number;
//     beneficiaryId: number;
//     paymentMethod: string;
//     startDate: string;
//     endDate?: string;
//     trialDays?: number;
// }

// type CreateSubscriptionReturn = {
//     newSubscription: MemberSubscription;
//     newTransaction: Transaction;
//     newInvoice: MemberInvoice;
// }


// function createSubscription(data: SubscriptionData, plan: MemberPlan): CreateSubscriptionReturn {

//     const today = new Date();
//     const startDate = new Date(data.startDate);
//     const endDate = data.endDate ? new Date(data.endDate) : undefined;
//     const ids = {
//         memberId: data.mid,
//         locationId: data.id,
//     }
//     /**
//      * Convert date to Unix timestamp (seconds since epoch)
//      * Math.floor ensures we get a whole number of seconds
//      * Stripe API requires timestamps in seconds, not milliseconds
//      */
//     let trialEnd: Date | undefined;
//     if (data.trialDays) {
//         if (isAfter(startDate, today)) {
//             trialEnd = new Date(Math.max(startDate.getTime(), (startDate.getTime() + data.trialDays * 24 * 60 * 60 * 1000)))
//         } else {
//             trialEnd = new Date(Math.max(today.getTime(), (today.getTime() + data.trialDays * 24 * 60 * 60 * 1000)))
//         }
//     }

//     let newSubscription: MemberSubscription = {
//         payerId: data.mid,
//         beneficiaryId: data.beneficiaryId,
//         locationId: data.id,
//         planId: data.memberPlanId,
//         startDate,
//         currentPeriodStart: startDate,
//         currentPeriodEnd: calculateCurrentPeriodEnd(startDate, plan),
//         paymentType: data.paymentMethod,
//         status: "incomplete",
//         trialEnd,
//     }

//     let newTransaction: Transaction = {
//         ...ids,
//         chargeDate: today,
//         status: "incomplete",
//         transactionType: "incoming",
//         paymentType: 'recurring',
//         paymentMethod: data.paymentMethod,
//         description: `Subscription to ${plan.name}`,
//         amount: plan.price,
//         currency: plan.currency,
//         item: plan.name,
//     };

//     return { newSubscription, newTransaction }
// }


