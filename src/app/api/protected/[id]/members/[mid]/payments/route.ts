import { auth } from "@/auth";
import { db } from "@/db/db";
import { getStripe } from "@/libs/server-utils";
import { and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(req: Request, props: { params: Promise<{ id: number }> }) {
    const params = await props.params;
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    try {

        if (session && customerId) {
            const integrations = await db.query.integrations.findFirst({
                where: (integration, { eq }) => (and(eq(integration.locationId, params.id), eq(integration.service, "Stripe"))),
                columns: {
                    accessToken: true
                }
            })

            if (integrations?.accessToken) {
                const stripe = getStripe(integrations?.accessToken);
                const charges = await stripe.charges.list(
                    {
                        limit: 25,
                        customer: customerId
                    }
                );
                return NextResponse.json(charges.data, { status: 200 });
            } else {
                return NextResponse.json({ error: "Stripe integration required." }, { status: 500 })
            }
        }
    } catch (err) {
        // console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}


export async function PUT(req: Request, props: { params: Promise<{ id: number }> }) {
    const params = await props.params;
    const session = await auth();
    const data = await req.json();
    try {

        if (session) {
            const integrations = await db.query.integrations.findFirst({
                where: (integration, { eq }) => (and(eq(integration.locationId, params.id), eq(integration.service, "Stripe"))),
                columns: {
                    accessToken: true
                }
            })
            let refund: any;
            if (integrations?.accessToken) {
                const stripe = require('stripe')(integrations?.accessToken);
                refund = await stripe.refunds.create(
                    {
                        charge: data.chargeId
                    }
                );
            } else {
                return NextResponse.json({ error: "Something Went Wrong" }, { status: 500 })
            }
            return NextResponse.json({ message: "Success", data: refund.data }, { status: 200 });
        }
    } catch (err) {
        // console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}