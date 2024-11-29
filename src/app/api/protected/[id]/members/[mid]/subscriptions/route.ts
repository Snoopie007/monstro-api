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
                const subscriptions = await stripe.subscriptions.list(
                    {
                        limit: 25,
                        customer: customerId
                    }
                );

                return NextResponse.json(subscriptions.data, { status: 200 });
            } else {
                return NextResponse.json({ error: "Stripe integration required." }, { status: 500 })
            }
        }
    } catch (err) {
        // console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}