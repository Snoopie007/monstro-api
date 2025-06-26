
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { memberPlans, planPrograms } from '@/db/schemas';
import { and } from 'drizzle-orm';
import { MemberStripePayments } from '@/libs/server/stripe';
import { encodeId } from '@/libs/server/sqids';

export async function GET(req: NextRequest, props: { params: Promise<{ id: number }> }) {
    const params = await props.params;

    try {

        const subs = await db.query.memberPlans.findMany({
            where: (memberPlans, { eq, and }) => and(eq(memberPlans.locationId, params.id), eq(memberPlans.type, 'recurring')),
            with: {
                planPrograms: {
                    with: {
                        program: true
                    }
                },
            }
        })


        return NextResponse.json(subs, { status: 200 });
    } catch (err) {
        return NextResponse.json({ error: err }, { status: 500 })
    }
}
export async function POST(req: Request, props: { params: Promise<{ id: number, pid: number }> }) {
    const params = await props.params;

    const { amount, programs, ...data } = await req.json()

    const formatedAmount = amount * 100
    try {

        const integration = await db.query.integrations.findFirst({
            where: (interations, { eq }) => and(
                eq(interations.locationId, params.id),
                eq(interations.service, "stripe")
            )
        });

        if (!integration) {
            return NextResponse.json({ error: "Stripe integration not found" }, { status: 400 })
        }
        const stripe = new MemberStripePayments(String(integration.id));
        
        const stripePrice = await stripe.createStripeProduct(
            { ...data, price: formatedAmount, programId: params.pid },
            { locationId: encodeId(params.id), planId: data.id, vendorAccountId: integration.integrationId }
        )

        if (!stripePrice) {
            return NextResponse.json({ error: "Failed to create Stripe product" }, { status: 500 })
        }



        const plan = await db.transaction(async (tx) => {
            const [plan] = await tx.insert(memberPlans).values({
                ...data,
                locationId: params.id,
                price: formatedAmount,
                programId: params.pid,
                stripePriceId: stripePrice.id || "",
            }).returning({ id: memberPlans.id });

            await tx.insert(planPrograms).values(programs.map((program: number) => ({
                planId: plan.id,
                programId: program,
            })));

            return plan
        })

        return NextResponse.json(plan, { status: 200 });
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}