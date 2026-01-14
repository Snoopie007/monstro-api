import { db } from "@/db/db";
import { memberPackages, memberPlanPricing, transactions } from "@/db/schemas";
import { eq } from "drizzle-orm";

import { PaymentType } from "@/types";
import { NextRequest, NextResponse } from "next/server";
import { addUserToGroup, calculateExpiresAt, calculateTax } from "../../../utils";

type Props = {
    params: Promise<{
        id: string;
        mid: string;
    }>
};

export async function POST(req: NextRequest, props: Props) {

    const { id, mid } = await props.params;
    const body = await req.json();

    const { trialDays, pricingId, ...data } = body;
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

        // Use pricing.price instead of plan.price
        const tax = calculateTax(pricing.price, taxRates);
        let subTotal = pricing.price;
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
                ...data,
                status: "active",
                startDate,
                expireDate,
                makeUpCredits: 0,
                allowMakeUpCarryOver: false,
            }).returning();

            /** Create Transaction */
            await tx.insert(transactions).values({
                description: `One time payment for ${plan.name} - ${pricing.name}`,
                ...CommonData,
                totalTax: tax,
                type: "inbound",
                items: [{
                    productId: plan.id,
                    amount: pricing.price,
                    tax: tax,
                    quantity: 1,
                }],
                status: "paid",
                subTotal: pricing.price,
                total,
                currency: plan.currency,
                metadata: {
                    packageId: pkg.id,
                    pricingId: pricing.id,
                },
            });
            return pkg;
        });

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
