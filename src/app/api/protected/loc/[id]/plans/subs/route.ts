
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { memberPlans } from '@/db/schemas';
import { and } from 'drizzle-orm';
import { MemberStripePayments } from '@/libs/server/stripe';
import { encodeId } from '@/libs/server/sqids';

export async function GET(req: NextRequest, props: { params: Promise<{ id: number }> }) {
    const params = await props.params;
    const { searchParams } = new URL(req.url);

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

    const { amount, ...data } = await req.json()

    const formatedAmount = amount * 100
    try {

        const interation = await db.query.integrations.findFirst({
            where: (interations, { eq }) => and(
                eq(interations.locationId, params.id),
                eq(interations.service, "stripe")
            )
        });

        if (!interation || !interation.secretKey) {
            return NextResponse.json({ error: "Stripe integration not found" }, { status: 400 })
        }
        const stripe = new MemberStripePayments(interation.secretKey);
        const stripePrice = await stripe.createStripeProduct(
            { ...data, price: formatedAmount, programId: params.pid },
            encodeId(params.id)
        )



        const [plan] = await db.insert(memberPlans).values({
            ...data,
            price: formatedAmount,
            programId: params.pid,
            stripePriceId: stripePrice.id || "",
        }).returning({ id: memberPlans.id });

        return NextResponse.json(plan, { status: 200 });
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}