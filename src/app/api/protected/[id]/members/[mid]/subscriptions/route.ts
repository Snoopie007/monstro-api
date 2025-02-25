import { auth } from "@/auth";
import { db } from "@/db/db";
import { StripePayments } from "@/libs/server/stripe";
import { and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(req: Request, props: { params: Promise<{ id: number, mid: number }> }) {
    const params = await props.params;

    const session = await auth();
    // const { searchParams } = new URL(req.url);
    // const customerId = searchParams.get('customerId');

    try {
        const subscriptions = await db.query.memberSubscriptions.findMany({
            where: (memberSubscriptions, { eq }) => eq(memberSubscriptions.beneficiaryId, params.mid),
            with: {
                plan: {
                    with: {
                        pricing: true
                    }
                }
            }
        })

        // if (session && customerId) {
        //     const integrations = await db.query.integrations.findFirst({
        //         where: (integration, { eq }) => (and(eq(integration.locationId, params.id), eq(integration.service, "Stripe"))),
        //         columns: {
        //             accessToken: true
        //         }
        //     })

        //     if (integrations?.accessToken) {
        //         const stripe = new StripePayments(integrations?.accessToken);
        //         const subscriptions = await stripe.getSubscriptions(
        //             customerId,

        //         );

        //         return NextResponse.json(subscriptions.data, { status: 200 });
        //     } else {
        //         return NextResponse.json({ error: "Stripe integration required." }, { status: 500 })
        //     }
        // }
        return NextResponse.json(subscriptions, { status: 200 })
    } catch (err) {
        // console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}