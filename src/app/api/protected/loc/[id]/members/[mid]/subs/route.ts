import { db } from "@/db/db";
import { memberSubscriptions, memberPlanPricing } from "@/db/schemas";
import { MemberStripePayments } from "@/libs/server/stripe";
import { NextRequest, NextResponse } from "next/server";
import {
    addUserToGroup,
    calculatePeriodEnd,
    calculateStripeFeePercentage,
    calculateTrialEnd,
    scheduleRecurringInvoiceReminders,
    calculateExpiresAt,
} from "../../utils";
import { eq } from "drizzle-orm";

import { PaymentType } from "@/types";
import { getTaxRateId } from "../../utils";


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
                },
                pricing: true
            }
        })

        return NextResponse.json(subscriptions, { status: 200 })
    } catch (err) {
        return NextResponse.json({ error: err }, { status: 500 })
    }
}


export async function POST(req: Request, props: Props) {
    const { id, mid } = await props.params;
    const body = await req.json();
    const { paymentMethod, paymentType, trialDays, pricingId, ...data } = body;

    try {
        // Validate pricingId is provided
        if (!pricingId) {
            return NextResponse.json({ error: "Pricing selection is required" }, { status: 400 });
        }

        // Fetch the pricing option
        const pricing = await db.query.memberPlanPricing.findFirst({
            where: eq(memberPlanPricing.id, pricingId)
        });

        if (!pricing) {
            return NextResponse.json({ error: "Pricing option not found" }, { status: 404 });
        }

        const plan = await db.query.memberPlans.findFirst({
            where: (memberPlan, { eq }) => eq(memberPlan.id, data.memberPlanId)
        })

        if (!plan) {
            throw new Error("Plan not found")
        }

        // Validate pricing belongs to the plan
        if (pricing.memberPlanId !== plan.id) {
            return NextResponse.json({ error: "Pricing does not belong to this plan" }, { status: 400 });
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
                        taxRates: true,
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
        
        // Use pricing for period calculation
        const endDate = calculatePeriodEnd(
            startDate,
            pricing.interval!,
            pricing.intervalThreshold!
        );

        // Calculate expires_at from pricing term if set
        const expiresAt = calculateExpiresAt(startDate, pricing.expireInterval, pricing.expireThreshold);

        const taxRateId = getTaxRateId(location.taxRates);


        const stripeFeePercentage = calculateStripeFeePercentage(pricing.price, paymentMethod.type as PaymentType);
        const feePercent = location.locationState?.usagePercent + stripeFeePercentage;

        // Pass both plan and pricing to createSubscription
        const stripeSubscription = await stripe.createSubscription(plan, pricing, {
            startDate,
            cancelAt: expiresAt || (data.cancelAt ? new Date(data.cancelAt) : undefined),
            trialEnd: trialDays ? calculateTrialEnd(startDate, trialDays) : undefined,
            paymentMethod: paymentMethod.stripeId,
            allowProration: plan.allowProration,
            feePercent,
            taxRateId,
            metadata: {
                memberId: mid,
                locationId: id,
                pricingId: pricing.id
            },
        })


        const [sub] = await db.insert(memberSubscriptions).values({
            stripeSubscriptionId: stripeSubscription.id,
            startDate: startDate,
            currentPeriodStart: startDate,
            currentPeriodEnd: endDate,
            expiresAt: expiresAt,
            locationId: id,
            memberId: mid,
            memberPlanId: plan.id,
            memberPlanPricingId: pricing.id,
            paymentType,
            status: "incomplete",
            metadata: {
                paymentMethodId: paymentMethod.id,
                memberId: mid,
                locationId: id
            }
        }).returning()

        // Add user to group if plan has a groupId
        if (plan.groupId && member.userId) {
            await addUserToGroup({ groupId: plan.groupId, userId: member.userId });
        }

        const { locationState } = location;

        if (locationState?.planId && locationState.planId >= 2) {
            if (member && location && pricing.interval && pricing.intervalThreshold) {
                await scheduleRecurringInvoiceReminders({ 
                    subscriptionId: sub.id, 
                    memberId: mid, 
                    locationId: id 
                });
                console.log(`📧 Scheduled recurring invoice emails for subscription ${sub.id}`);
            }
        }

        return NextResponse.json({ ...sub, plan: plan, pricing: pricing }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}




