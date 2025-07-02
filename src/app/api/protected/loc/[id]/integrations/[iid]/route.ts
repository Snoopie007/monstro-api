import { db } from "@/db/db";
import { integrations } from "@/db/schemas";
import { VendorStripePayments } from "@/libs/server/stripe";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = {
    id: number;
    iid: string;
}

export async function DELETE(req: NextRequest, props: { params: Promise<Params> }) {
    const params = await props.params;

    try {
        const integration = await db.query.integrations.findFirst({
            where: (integrations, { eq }) => eq(integrations.id, params.iid)
        })

        if (!integration) {
            return NextResponse.json({ error: "Integration not found" }, { status: 404 })
        }

        if (integration.service === "stripe") {
            const stripe = new VendorStripePayments()
            await stripe.removeAccount(integration.accountId)
        }

        await db.delete(integrations).where(eq(integrations.id, params.iid))

        return NextResponse.json({ message: "Integration deleted" }, { status: 200 })


    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}
