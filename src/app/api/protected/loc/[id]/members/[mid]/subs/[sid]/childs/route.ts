import { db } from "@/db/db";
import { NextResponse } from "next/server";


type Params = {
    id: string;
    mid: string;
    sid: string;
}

export async function GET(req: Request, props: { params: Promise<Params> }) {
    const params = await props.params;
    try {

        const familyPlans = await db.query.memberSubscriptions.findMany({
            where: (memberSubscriptions, { eq, and }) => and(
                eq(memberSubscriptions.locationId, params.id),
                eq(memberSubscriptions.parentId, params.sid),
            ),
            with: {
                member: true,
            },
        });

        return NextResponse.json(familyPlans, { status: 200 });
    } catch (err) {
        return NextResponse.json({ error: err }, { status: 500 });
    }
}