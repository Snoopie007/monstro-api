import { db } from "@/db/db";
import { memberInvoices, memberLocations, memberSubscriptions, transactions } from "@/db/schemas";
import { getStripeCustomer } from "@/libs/server/stripe";
import { createSubscription } from "../../utils";
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


        const sid = await db.transaction(async (tx) => {
            const [{ sid }] = await tx.insert(memberSubscriptions).values({
                ...newSubscription
            }).returning({ sid: memberSubscriptions.id })


            if (data.paymentMethod === "cash") {

                const [{ invoiceId }] = await tx.insert(memberInvoices).values({
                    ...newInvoice,
                    status: "draft",
                    memberSubscriptionId: sid
                }).returning({ invoiceId: memberInvoices.id });
                await tx.insert(transactions).values({
                    ...newTransaction,
                    invoiceId,
                    subscriptionId: sid,
                    status: "paid",
                });
            }
            return sid
        })



        return NextResponse.json({ sid }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: number, mid: number }> }) {
    const params = await props.params;
    const { subscriptionId } = await req.json();

    try {
        // First check if subscription exists
        const existingSub = await db.query.memberSubscriptions.findFirst({
            where: (memberSubscriptions, { eq, and }) => and(
                eq(memberSubscriptions.id, subscriptionId),
                eq(memberSubscriptions.memberId, params.mid),
                eq(memberSubscriptions.locationId, params.id)
            )
        });

        if (!existingSub) {
            return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
        }

        const deletedSub = await db.update(memberSubscriptions)
            .set({
                status: "canceled",
                cancelAt: new Date(),

            })
            .where(and(
                eq(memberSubscriptions.id, subscriptionId),
                eq(memberSubscriptions.memberId, params.mid),
                eq(memberSubscriptions.locationId, params.id)
            ))
            .returning();

        return NextResponse.json(deletedSub, { status: 200 });
    } catch (err) {
        console.log(err);
        return NextResponse.json({ error: err }, { status: 500 });
    }
}