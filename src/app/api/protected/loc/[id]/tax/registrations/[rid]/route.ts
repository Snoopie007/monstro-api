import { db } from "@/db/db";
import { MemberStripePayments } from "@/libs/server/stripe";
import { NextRequest, NextResponse } from "next/server";


type Props = {
    params: Promise<{ id: number, rid: string }>
}


export async function PATCH(req: NextRequest, props: Props) {
    const params = await props.params;

    try {
        const integration = await db.query.integrations.findFirst({
            where: (integration, { eq, and }) => and(eq(integration.locationId, params.id), eq(integration.service, "stripe")),
        });
        if (!integration || !integration.accessToken) {
            return NextResponse.json({ error: "Stripe account not found" }, { status: 404 });
        }
        const stripe = new MemberStripePayments(integration.accessToken);

        const tax = await stripe.updateTaxRegistration(params.rid, {
            expires_at: 'now'
        });

        return NextResponse.json({ tax }, { status: 200 });

    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Failed to update tax settings" }, { status: 500 });
    }
}

