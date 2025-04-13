import { db } from "@/db/db";
import { MemberStripePayments } from "@/libs/server/stripe";
import { NextRequest, NextResponse } from "next/server";

type Props = {
    params: Promise<{ id: number }>
}

export async function GET(req: NextRequest, props: Props) {
    const params = await props.params;

    try {
        const integration = await db.query.integrations.findFirst({
            where: (integration, { eq, and }) => and(eq(integration.locationId, params.id), eq(integration.service, "stripe")),
        })

        if (!integration || !integration.accessToken) {
            throw new Error("Stripe account not found");
        }
        const stripe = new MemberStripePayments(integration.accessToken);
        const [taxSettings, taxRegistrations] = await Promise.all([
            stripe.retrieveTaxSettings(),
            stripe.getTaxRegistrations()
        ]);
        return NextResponse.json({ settings: taxSettings, registrations: taxRegistrations }, { status: 200 });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error }, { status: 500 });
    }
}


