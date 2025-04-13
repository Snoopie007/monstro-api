import { MemberStripePayments } from "@/libs/server/stripe";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";

type Props = {
    params: Promise<{ id: number }>
}

export async function POST(request: NextRequest, props: Props) {
    const params = await props.params;
    const { amount, quantity, reference } = await request.json();

    const integration = await db.query.integrations.findFirst({
        where: (integration, { eq, and }) => and(eq(integration.locationId, params.id), eq(integration.service, "stripe")),
    });
    if (!integration || !integration.accessToken) {
        return NextResponse.json({ error: "Stripe account not found" }, { status: 404 });
    }
    const stripe = new MemberStripePayments(integration.accessToken);
    stripe.setCustomer("cus_S6aeF5pkGsEAcF");
    await stripe.calculateTax(10000, 1, "reference");
    return NextResponse.json({ message: "Tax calculated" }, { status: 200 });
}
