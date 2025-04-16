import { db } from "@/db/db";
import { NextResponse } from "next/server";

export async function GET(req: Request, props: { params: Promise<{ id: number, mid: number }> }) {
    const params = await props.params;

    try {
        const rewards = await db.query.memberRewards.findMany({
            where: (memberRewards, { eq, and }) => and(
                eq(memberRewards.memberId, params.mid)
            )
        })

        return NextResponse.json(rewards, { status: 200 })
    } catch (err) {
        // console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}



