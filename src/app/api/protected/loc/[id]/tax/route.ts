import { db } from "@/db/db";
import { locationState } from "@/db/schemas/locations";
import { eq } from "drizzle-orm";
import { MemberStripePayments } from "@/libs/server/stripe";
import { NextRequest, NextResponse } from "next/server";


type Props = {
    params: Promise<{ id: number }>
}


export async function POST(request: NextRequest, props: Props) {
    const params = await props.params;
    const data = await request.json();
    try {
        await db.update(locationState).set({
            taxRate: data.taxRate
        }).where(eq(locationState.locationId, params.id));

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Failed to update tax settings" }, { status: 500 });
    }
}

