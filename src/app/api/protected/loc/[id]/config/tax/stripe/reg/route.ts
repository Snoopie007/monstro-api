import { db } from "@/db/db";
import { MemberStripePayments } from "@/libs/server/stripe";
import { NextRequest, NextResponse } from "next/server";


type Props = {
    params: Promise<{ id: string }>
}


export async function POST(request: NextRequest, props: Props) {
    const params = await props.params;
    const { state, type, country } = await request.json();

    try {
        const integration = await db.query.integrations.findFirst({
            where: (integration, { eq, and }) => and(eq(integration.locationId, params.id), eq(integration.service, "stripe")),
        });
        if (!integration || !integration.accessToken) {
            return NextResponse.json({ error: "Stripe account not found" }, { status: 404 });
        }
        const stripe = new MemberStripePayments(integration.accessToken);
        const isoState = `${state.substring(0, 2).toUpperCase()}`;



        const registration = await stripe.createTaxRegistration(type, isoState, country);

        return NextResponse.json(registration, { status: 200 });

    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Failed to update tax settings" }, { status: 500 });
    }
}

