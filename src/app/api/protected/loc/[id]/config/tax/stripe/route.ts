import { db } from "@/db/db";
import { MemberStripePayments } from "@/libs/server/stripe";
import { NextRequest, NextResponse } from "next/server";


type Props = {
    params: Promise<{ id: string }>
}


export async function POST(request: NextRequest, props: Props) {
    const params = await props.params;
    const { taxRateId } = await request.json();
    try {

        const taxRate = await db.query.taxRates.findFirst({
            where: (taxRates, { eq }) => eq(taxRates.id, taxRateId),
        });
        if (!taxRate) {
            return NextResponse.json({ error: "Tax rate not found" }, { status: 404 });
        }
        const integration = await db.query.integrations.findFirst({
            where: (integration, { eq, and }) => and(eq(integration.locationId, params.id), eq(integration.service, "stripe")),
        });
        if (!integration || !integration.accessToken) {
            return NextResponse.json({ error: "Stripe account not found" }, { status: 404 });
        }

        const isoState = `${taxRate.state.substring(0, 2).toUpperCase()}`;

        const stripe = new MemberStripePayments(integration.accessToken);

        await stripe.createTaxRate({
            display_name: taxRate.name,
            percentage: taxRate.percentage,
            country: taxRate.country,
            state: isoState,
            inclusive: taxRate.inclusive,
            description: taxRate.description ?? undefined,
            active: taxRate.status === "active" ? true : false,
        });


        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Failed to update tax settings" }, { status: 500 });
    }
}

