import { db } from "@/db/db";
import { NextResponse } from "next/server";


type Params = {
    id: string;
    mid: string;
    pkid: string;
}

export async function GET(req: Request, props: { params: Promise<Params> }) {
    const params = await props.params;
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get('parentId');
    try {

        const parentPackage = await db.query.memberPackages.findFirst({
            where: (memberPackages, { eq, and }) => and(
                eq(memberPackages.locationId, params.id),
                eq(memberPackages.id, parentId as string),
            ),
            with: {
                member: true,
            },
        });

        return NextResponse.json(parentPackage, { status: 200 });
    } catch (err) {
        return NextResponse.json({ error: err }, { status: 500 });
    }
}