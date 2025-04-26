
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { aiBots } from "@/db/schemas";

export async function GET(req: NextRequest, props: { params: Promise<{ id: number }> }) {
    const params = await props.params;
    const { id } = params;

    try {
        const bots = await db.query.aiBots.findMany({
            where: (aiBots, { eq }) => (eq(aiBots.locationId, id)),
        });


        return NextResponse.json(bots, { status: 200 })
    } catch (error) {
        console.log(error)
        return NextResponse.json({ message: "Something when wrong." }, { status: 500 })

    }
}



export async function POST(req: NextRequest, props: { params: Promise<{ id: number }> }) {

    const { id } = await props.params;
    const data = await req.json();
    try {

        const [bot] = await db.insert(aiBots).values({
            ...data,
            locationId: id,
        }).returning({ id: aiBots.id })


        return NextResponse.json(bot, { status: 200 })
    } catch (error) {
        console.log("Error ", error);
        return NextResponse.json({ message: "Error" }, { status: 500 })
    }
}

