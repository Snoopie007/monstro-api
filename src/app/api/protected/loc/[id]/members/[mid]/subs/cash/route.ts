import { db } from "@/db/db";
import { memberSubscriptions, memberPlanPricing, promos } from "@/db/schemas";
import { NextResponse } from "next/server";
import {
    addUserToGroup,
    calculatePeriodEnd,
    calculateExpiresAt,
    scheduleRecurringInvoiceReminders,
} from "../../../utils";
import { eq, and, sql } from "drizzle-orm";


type Props = {
    params: Promise<{
        id: string;
        mid: string;
    }>
}

export async function POST(req: Request, props: Props) {
    const { id, mid } = await props.params;
    const { paymentMethod, paymentType, trialDays, pricingId, promoCode, ...data } = await req.json();
    try {
        let promoId: string | undefined;
        let discountAmount = 0;
        if (promoCode) {
            const promo = await db.query.promos.findFirst({
                where: and(
                    eq(promos.code, promoCode.toUpperCase()),
                    eq(promos.locationId, id),
                    eq(promos.isActive, true)
                )
            });

            if (!promo) {
                return NextResponse.json({ error: "Invalid promo code" }, { status: 400 });
            }

            if (promo.expiresAt && new Date() > promo.expiresAt) {
                return NextResponse.json({ error: "Promo code has expired" }, { status: 400 });
            }

            // Check max redemptions
            if (promo.maxRedemptions && promo.redemptionCount >= promo.maxRedemptions) {
                return NextResponse.json({ error: "Promo code redemption limit reached" }, { status: 400 });
            }

            // Check "once" duration - has this member already used this promo?
            if (promo.duration === "once") {
                const existingUsage = await db.query.memberSubscriptions.findFirst({
                    where: and(
                        eq(memberSubscriptions.promoId, promo.id),
                        eq(memberSubscriptions.memberId, mid)
                    )
                });
                if (existingUsage) {
                    return NextResponse.json({ error: "This promo has already been used by this member" }, { status: 400 });
                }
            }

            promoId = promo.id;
        }

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

        // Check if promo is restricted to specific plans
        if (promoId) {
            const promo = await db.query.promos.findFirst({
                where: eq(promos.id, promoId)
            });
            if (promo) {
                if (promo.allowedPlans && promo.allowedPlans.length > 0) {
                    if (!promo.allowedPlans.includes(plan.id)) {
                        return NextResponse.json({ error: "This promo code is not valid for this plan" }, { status: 400 });
                    }
                }
                if (promo.type === "percentage") {
                    discountAmount = Math.floor(pricing.price * (promo.value / 100));
                } else if (promo.type === "fixed_amount") {
                    discountAmount = Math.min(promo.value, pricing.price);
                }
            }
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

        if (!member) {
            throw new Error("Member not found");
        }



        const today = new Date()
        const startDate = data.startDate ? new Date(data.startDate) : today;
        
        // Use pricing for period calculation
        const periodEnd = calculatePeriodEnd(
            startDate,
            pricing.interval!,
            pricing.intervalThreshold!
        );

        // Calculate expires_at: use manually selected endDate first, then pricing term, then null (ongoing)
        let expiresAt: Date | null = null;
        if (data.endDate) {
            // User manually selected an end date from Duration picker
            expiresAt = new Date(data.endDate);
        } else if (pricing.expireInterval && pricing.expireThreshold) {
            // Use pricing term settings
            expiresAt = calculateExpiresAt(startDate, pricing.expireInterval, pricing.expireThreshold);
        }

        const [sub] = await db.insert(memberSubscriptions).values({
            startDate: startDate,
            currentPeriodStart: startDate,
            currentPeriodEnd: periodEnd,
            expiresAt: expiresAt,
            locationId: id,
            memberId: mid,
            memberPlanPricingId: pricing.id,
            promoId,
            paymentType,
            status: "active",
            makeUpCredits: 0,
            allowMakeUpCarryOver: false,
            metadata: {
                memberId: mid,
                locationId: id,
                ...(promoId && {
                    promoId,
                    originalPrice: pricing.price,
                    discountAmount,
                    discountedPrice: Math.max(0, pricing.price - discountAmount)
                })
            }
        }).returning()

        // Increment redemption count if promo was used
        if (promoId) {
            await db.update(promos)
                .set({ redemptionCount: sql`${promos.redemptionCount} + 1` })
                .where(eq(promos.id, promoId));
        }

        // Add user to group if plan has a groupId
        if (plan.groupId && member.userId) {
            await addUserToGroup({ groupId: plan.groupId, userId: member.userId });
        }

        const { locationState } = location;

        if (locationState?.planId && locationState.planId >= 2) {
            if (member && location && pricing.interval && pricing.intervalThreshold) {
                await scheduleRecurringInvoiceReminders({ subscriptionId: sub.id, memberId: mid, locationId: id });
                console.log(`📧 Scheduled recurring invoice emails for subscription ${sub.id}`);
            }
        }

        return NextResponse.json({ ...sub, plan: plan, pricing: pricing }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

