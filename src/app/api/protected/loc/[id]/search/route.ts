import { NextResponse } from 'next/server';
import { db } from '@/db/db';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;

    const { searchParams } = new URL(req.url);

    const email = searchParams.get("email") || "";

    try {
        const member = await db.query.members.findFirst({
            where: (member, { eq }) => eq(member.email, email),
            with: {
                memberLocations: {
                    where: (memberLocation, { eq }) => eq(memberLocation.locationId, params.id),
                },
            }
        });

        if (!member) {
            return NextResponse.json({ error: "Member not found" }, { status: 404 });
        }

        return NextResponse.json(member, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
