import { db } from "@/db/db";
import { locations } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const data = await req.json()
    try {

        await db.update(locations).set({
            ...data,
        }).where(eq(locations.id, params.id))


        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}