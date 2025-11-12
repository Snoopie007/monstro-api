import { db } from "@/db/db";
import { memberPackages, transactions } from "@/db/schemas";
import { MemberStripePayments } from "@/libs/server/stripe";

import { NextRequest, NextResponse } from "next/server";
import { calculatePeriodEnd, calculateStripeFeeAmount, calculateTax } from "../../../utils";
import { PaymentType } from "@/types";

type Props = {
    params: Promise<{
        id: string;
        mid: string;
    }>
};

export async function POST(req: NextRequest, props: Props) {

    const { id, mid } = await props.params;
    const body = await req.json();

    const { trialDays, ...data } = body;
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

        const { expireInterval, expireThreshold } = plan;

        let expireDate: Date | null = null;
        if (data.expireDate) {
            expireDate = new Date(data.expireDate);
        } else if (expireInterval && expireThreshold) {
            expireDate = calculatePeriodEnd(
                startDate,
                expireInterval,
                expireThreshold
            );
        }

        const tax = calculateTax(plan.price, taxRates);
        let subTotal = plan.price;
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
                ...data,
                status: "active",
                startDate,
                expireDate,
            }).returning();

            /** Create Transaction */
            await tx.insert(transactions).values({
                description: `One time payment for ${plan.name}`,
                ...CommonData,
                totalTax: tax,
                type: "inbound",
                items: [{
                    productId: plan.id,
                    amount: plan.price,
                    tax: tax,
                    quantity: 1,
                }],
                status: "paid",
                subTotal: plan.price,
                total,
                currency: plan.currency,
                metadata: {
                    packageId: pkg.id,
                },
            });
            return pkg;
        });


        // Send email receipt

        // Hook to expire day

        // Trigger evaluation of triggers

        return NextResponse.json({ ...pkg, plan }, { status: 200 });
    } catch (err) {
        console.log(err);
        return NextResponse.json({ error: err }, { status: 500 });
    }
}
