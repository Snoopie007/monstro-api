import { db } from "@/db/db";
import { NextResponse } from "next/server";


type Params = {
    id: string;
    mid: string;
    sid: string;
}

export async function GET(req: Request, props: { params: Promise<Params> }) {
    const params = await props.params;
    const data = await req.json();
    try {

        const parentSubscription = await db.query.memberSubscriptions.findFirst({
            where: (memberSubscriptions, { eq, and }) => and(
                eq(memberSubscriptions.locationId, params.id),
                eq(memberSubscriptions.id, data.parentId),
            ),
            with: {
                member: true,
            },
        });

        return NextResponse.json(parentSubscription, { status: 200 });
    } catch (err) {
        return NextResponse.json({ error: err }, { status: 500 });
    }
}