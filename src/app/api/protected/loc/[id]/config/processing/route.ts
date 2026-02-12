import { db } from "@/db/db";
import { locationState } from "@subtrees/schemas";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const data = await req.json()

    try {

        await db.update(locationState).set(data)
            .where(eq(locationState.locationId, params.id))


        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}