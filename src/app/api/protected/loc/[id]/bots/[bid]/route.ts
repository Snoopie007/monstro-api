
import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/libs/server/redis";
import { db } from "@/db/db";
import { aiBots } from "@/db/schemas";
import { eq } from "drizzle-orm";

const redis = getRedisClient();

export async function GET(req: NextRequest, props: { params: Promise<{ id: string, bid: number }> }) {
    const { bid } = await props.params;
    try {
        const bot = await db.query.aiBots.findFirst({
            where: (aiBots, { eq }) => eq(aiBots.id, bid)
        });
        return NextResponse.json(bot, { status: 200 });
    } catch (error) {
        console.log("Error ", error);
        return NextResponse.json({ message: "Error" }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string, bid: number }> }) {
    const { bid } = await props.params;
    const data = await req.json();
    try {
        const bot = await db.update(aiBots).set(data).where(eq(aiBots.id, bid));
        return NextResponse.json(bot, { status: 200 });
    } catch (error) {
        console.log("Error ", error);
        return NextResponse.json({ message: "Error" }, { status: 500 })
    }
}

export async function PUT(req: NextRequest, props: { params: Promise<{ bid: string }> }) {
    const { bid } = await props.params;

    try {
        await redis.del(`tracker:${bid}`, `conversation:${bid}`, `log:${bid}`);
        return NextResponse.json({ success: true }, { status: 200 })
    } catch (error) {
        console.log("Error ", error);
        return NextResponse.json({ message: "Error" }, { status: 500 })
    }
}

