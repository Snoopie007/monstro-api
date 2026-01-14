import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { taxRates } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { MemberStripePayments } from "@/libs/server/stripe";


type Props = {
    params: Promise<{ id: string; taxId: string }>
}
export async function PATCH(req: NextRequest, props: Props) {
    const params = await props.params;
    const data = await req.json();
    const { taxId } = params;
    try {
        const [taxRate] = await db.update(taxRates).set(data).where(eq(taxRates.id, taxId)).returning();

        if (taxRate.stripeRateId) {
            const integration = await db.query.integrations.findFirst({
                where: (integration, { eq, and }) => and(eq(integration.locationId, params.id), eq(integration.service, "stripe")),
            });
            if (!integration || !integration.accessToken) {
                return NextResponse.json({ error: "Stripe account not found" }, { status: 404 });
            }

            const stripe = new MemberStripePayments(integration.accessToken);
            await stripe.updateTaxRate(taxRate.stripeRateId, {
                display_name: taxRate.name,
                description: taxRate.description ?? undefined,
                active: taxRate.status === "active" ? true : false,
            });
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Failed to update tax rate" }, { status: 500 });
    }
}


export async function DELETE(req: NextRequest, props: Props) {
    const params = await props.params;
    const { taxId } = params;
    try {
        await db.delete(taxRates).where(eq(taxRates.id, taxId));
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Failed to delete tax rate" }, { status: 500 });
    }
}