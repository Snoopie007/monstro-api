
import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/db/db';
import { memberPlans } from '@/db/schemas';
import { and } from 'drizzle-orm';
import { MemberStripePayments } from '@/libs/server/stripe';


export async function GET(req: Request, props: { params: Promise<{ pid: number, id: number }> }) {
    const params = await props.params;
    const session = await auth();
    try {
        if (session) {

            const plans = db.query.memberPlans.findMany({
                where: (memberPlans, { eq }) => eq(memberPlans.programId, params.pid),
            });
            console.log(plans)
            return NextResponse.json(plans, { status: 200 });
        }
    } catch (err) {
        return NextResponse.json({ error: err }, { status: 500 })
    }
}


export async function POST(req: Request, props: { params: Promise<{ id: number, pid: number }> }) {
    const params = await props.params;
    const session = await auth();
    const data = await req.json()
    try {
        if (session) {
            let stripePiceId = "";
            if(data.pricing.billingPeriod != "One Time") {
                const interation = await db.query.integrations.findFirst({
                    where: (interations, { eq }) => and(
                        eq(interations.locationId, params.id),
                        eq(interations.service, "stripe")
                    )
                });
                
                if(interation && interation.secretKey) {
                    const stripe = new MemberStripePayments(interation.secretKey);
                    const stripePrice = await stripe.createStripeProduct(
                        {
                            name: data.name,
                            description: data.description,
                            amount: (data.pricing.amount * 100),
                            billingPeriod: data.pricing.billingPeriod,
                            currency: "usd"
                        }
                    );
                    console.log(stripePrice);
                    stripePiceId = stripePrice.id;
                }

            }
            const newPlan = db.transaction(async (trx) => {
                const [plan] = await trx.insert(memberPlans).values({
                    name: data.name,
                    programId: params.pid,
                    created: new Date(),
                    stripePriceId: stripePiceId,
                    description: data.description,
                    currency: "usd",
                    price: (data.pricing.amount * 100),
                    family: data.family,
                    familyMemberLimit: data.familyMemberLimit,
                    contractId: data.contractId ?? null,
                    interval: data.pricing.billingPeriod
                }).returning({ id: memberPlans.id });
                console.log(plan)
            });
            return NextResponse.json("Added", { status: 200 });
        }
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}