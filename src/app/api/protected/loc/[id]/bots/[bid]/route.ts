
import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/libs/server/redis";

const redis = getRedisClient();

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

