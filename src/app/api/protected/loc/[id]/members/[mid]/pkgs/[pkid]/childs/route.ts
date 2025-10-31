import { db } from "@/db/db";
import { NextResponse } from "next/server";


type Params = {
    id: string;
    mid: string;
    pkid: string;
}

export async function GET(req: Request, props: { params: Promise<Params> }) {
    const params = await props.params;
    try {

        const familyPlans = await db.query.memberPackages.findMany({
            where: (memberPackages, { eq, and }) => and(
                eq(memberPackages.locationId, params.id),
                eq(memberPackages.parentId, params.pkid),
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