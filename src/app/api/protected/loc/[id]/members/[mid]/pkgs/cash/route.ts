import { db } from "@/db/db";
import { memberLocations, memberPackages, memberPlanPricing, transactions, promos } from "@subtrees/schemas";
import { eq, and, sql } from "drizzle-orm";

import { PaymentType } from "@subtrees/types";
import { NextRequest, NextResponse } from "next/server";
import { addUserToGroup, calculateExpiresAt, calculateTax, validatePromoForCheckout } from "../../../utils";

type Props = {
    params: Promise<{
        id: string;
        mid: string;
    }>
};

export async function POST(req: NextRequest, props: Props) {

    const { id, mid } = await props.params;
    const body = await req.json();

    const { trialDays, pricingId, promoCode, ...data } = body;
    try {
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

        let promoId: string | undefined;
        let discountAmount = 0;


        const plan = await db.query.memberPlans.findFirst({
            where: (memberPlan, { eq }) => eq(memberPlan.id, data.memberPlanId)
        })

        if (!plan) {
            throw new Error("Plan not found")
        }

        const promoValidation = await validatePromoForCheckout({
            locationId: id,
            memberId: mid,
            pricingId,
            pricingPrice: pricing.price,
            promoCode,
            usageType: "package",
        });

        if (!promoValidation.ok) {
            return NextResponse.json(
                { error: promoValidation.message, code: promoValidation.code },
                { status: promoValidation.status }
            );
        }

        promoId = promoValidation.promoId;
        discountAmount = promoValidation.discountAmount || 0;

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

        const { location: { taxRates, locationState }, member } = ml;

        if (!member) {
            throw new Error("Member not found");
        }



        const today = new Date();
        const startDate = data.startDate ? new Date(data.startDate) : today;

        // Calculate expire date from pricing term if set
        let expireDate: Date | null = null;
        if (data.expireDate) {
            expireDate = new Date(data.expireDate);
        } else {
            expireDate = calculateExpiresAt(startDate, pricing.expireInterval, pricing.expireThreshold);
        }

        const discountedPrice = Math.max(0, pricing.price - discountAmount);
        const tax = calculateTax(discountedPrice, taxRates);
        let subTotal = discountedPrice;
        let total = subTotal + tax;



        const pkg = await db.transaction(async (tx) => {
            const CommonData = {
                locationId: id,
                memberId: mid,
                paymentType: "cash" as PaymentType,
            }

            const [pkg] = await tx.insert(memberPackages).values({
                ...CommonData,
                stripePaymentId: null,
                memberPlanId: plan.id,
                memberPlanPricingId: pricing.id,
                promoId,
                ...data,
                status: "active",
                startDate,
                expireDate,
                makeUpCredits: 0,
                allowMakeUpCarryOver: false,
            }).returning();

            await tx.insert(transactions).values({
                description: `One time payment for ${plan.name} - ${pricing.name}`,
                ...CommonData,
                totalTax: tax,
                type: "inbound",
                items: [{
                    productId: plan.id,
                    amount: discountedPrice,
                    tax: tax,
                    quantity: 1,
                }],
                status: "paid",
                subTotal: discountedPrice,
                total,
                currency: plan.currency,
                metadata: {
                    packageId: pkg.id,
                    pricingId: pricing.id,
                },
            });

            await tx
                .update(memberLocations)
                .set({
                    status: "active",
                    updated: new Date(),
                })
                .where(
                    and(
                        eq(memberLocations.memberId, mid),
                        eq(memberLocations.locationId, id)
                    )
                );
            return pkg;
        });

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

        return NextResponse.json({ ...pkg, plan, pricing }, { status: 200 });
    } catch (err) {
        console.log(err);
        return NextResponse.json({ error: err }, { status: 500 });
    }
}
