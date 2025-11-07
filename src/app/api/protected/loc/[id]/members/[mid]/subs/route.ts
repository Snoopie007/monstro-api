import { db } from "@/db/db";
import { memberSubscriptions } from "@/db/schemas";
import { MemberStripePayments } from "@/libs/server/stripe";
import {
    calculatePeriodEnd, calculateTrialEnd, calculateStripeFee
} from "../../utils";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { evaluateTriggers } from "@/libs/achievements";


type Props = {
    params: Promise<{
        id: string;
        mid: string;
    }>
}



export async function GET(req: NextRequest, props: Props) {
    const { id, mid } = await props.params;

    try {

        const subscriptions = await db.query.memberSubscriptions.findMany({
            where: (memberSubscriptions, { eq, and }) => and(
                eq(memberSubscriptions.memberId, mid),
                eq(memberSubscriptions.locationId, id)
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


export async function POST(req: Request, props: Props) {
    const { id, mid } = await props.params;
    const { paymentMethod, paymentType, trialDays, ...data } = await req.json();
    try {
        const plan = await db.query.memberPlans.findFirst({
            where: (memberPlan, { eq }) => eq(memberPlan.id, data.memberPlanId)
        })

        if (!plan) {
            throw new Error("Plan not found")
        }


        const ml = await db.query.memberLocations.findFirst({
            where: (memberLocation, { eq, and }) => and(
                eq(memberLocation.memberId, mid),
                eq(memberLocation.locationId, id)
            ),
            with: {
                member: true,
                location: {
                    with: {
                        locationState: true
                    }
                }
            }
        });

        if (!ml) {
            throw new Error("No member location found")
        }

        const { location, member } = ml;

        if (!member || !member.stripeCustomerId) {
            throw new Error("Member not found");
        }


        const integration = await db.query.integrations.findFirst({
            where: (integration, { eq, and }) =>
                and(
                    eq(integration.locationId, id),
                    eq(integration.service, "stripe")
                ),
            columns: {
                accountId: true,
            },
        });

        if (!integration) {
            throw new Error("Integration not found");
        }

        const stripe = new MemberStripePayments(integration.accountId)
        stripe.setCustomer(member.stripeCustomerId);

        const today = new Date()
        const startDate = data.startDate ? new Date(data.startDate) : today;
        const endDate = calculatePeriodEnd(
            startDate,
            plan.interval!,
            plan.intervalThreshold!
        );


        let feePercent = location.locationState?.usagePercent;

        if (paymentType === "card") {
            feePercent += calculateStripeFee(plan.price);
        }
        const stripeSubscription = await stripe.createSubscription(plan, {
            startDate,
            cancelAt: data.cancelAt ? new Date(data.cancelAt) : undefined,
            trialEnd: trialDays ? calculateTrialEnd(startDate, trialDays) : undefined,
            paymentMethod: paymentMethod.id,
            allowProration: plan.allowProration,
            feePercent: feePercent,
            metadata: {
                memberId: mid,
                locationId: id
            },
        })


        const [sub] = await db.insert(memberSubscriptions).values({
            stripeSubscriptionId: stripeSubscription.id,
            startDate: startDate,
            currentPeriodStart: startDate,
            currentPeriodEnd: endDate,
            locationId: id,
            memberId: mid,
            memberPlanId: plan.id,
            paymentType,
            status: "incomplete",
            metadata: {
                paymentMethodId: paymentMethod.id,
                memberId: mid,
                locationId: id
            }
        }).returning()



        // if (data.paymentType === "cash") {
        //     // Invoice starts as DRAFT
        //     const [{ invoiceId }] = await tx.insert(memberInvoices).values({

        //         status: "paid",
        //         paymentType: "cash",
        //         invoiceType: "recurring",
        //         memberSubscriptionId: sub.id
        //     }).returning({ invoiceId: memberInvoices.id });

        //     // Transaction created as incomplete
        //     await tx.insert(transactions).values({

        //         invoiceId,
        //         status: "paid",
        //         paymentType: "cash",
        //     });
        // }





        await evaluateTriggers({
            memberId: mid,
            locationId: id,
            triggerType: 'Plan Signup',

        });
        return NextResponse.json({ ...sub, plan: plan, }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}




