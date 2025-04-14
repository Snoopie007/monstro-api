import { db } from "@/db/db";
import { MemberStripePayments } from "@/libs/server/stripe";
import { NextRequest, NextResponse } from "next/server";


type Props = {
    params: Promise<{ id: number }>
}


export async function POST(request: NextRequest, props: Props) {
    const params = await props.params;
    const { office, ...rest } = await request.json();

    try {
        const integration = await db.query.integrations.findFirst({
            where: (integration, { eq, and }) => and(eq(integration.locationId, params.id), eq(integration.service, "stripe")),
        });
        if (!integration || !integration.accessToken) {
            return NextResponse.json({ error: "Stripe account not found" }, { status: 404 });
        }
        const stripe = new MemberStripePayments(integration.accessToken);
        const isoState = `${office.state.substring(0, 2).toUpperCase()}`;


        const taxSettings = await stripe.updateTaxSettings({
            defaults: {
                tax_behavior: rest.tax_behavior,
                tax_code: rest.tax_code,
            },
            head_office: {
                address: {
                    ...office,
                    state: isoState,
                },
            },
        });

        // Convert state name to ISO 3166-2

        const tax = await stripe.createTaxRegistration('state_sales_tax', isoState, 'US');

        return NextResponse.json(taxSettings, { status: 200 });

    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Failed to update tax settings" }, { status: 500 });
    }
}

