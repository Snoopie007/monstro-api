import { db } from "@/db/db";
import { taxRates } from "@/db/schemas";

import { NextRequest, NextResponse } from "next/server";


type Props = {
    params: Promise<{ id: string }>
}


export async function POST(request: NextRequest, props: Props) {
    const params = await props.params;
    const data = await request.json();
    try {
        const [taxRate] = await db.insert(taxRates).values({
            ...data,
            locationId: params.id,
        }).returning();

        return NextResponse.json(taxRate, { status: 200 });

    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Failed to update tax settings" }, { status: 500 });
    }
}

