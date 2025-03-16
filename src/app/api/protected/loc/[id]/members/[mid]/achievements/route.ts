import { NextResponse } from 'next/server';

import { db } from '@/db/db';

export async function GET(req: Request, props: { params: Promise<{ mid: number, id: number }> }) {
    const params = await props.params;
    try {

        const memberAchievements = await db.query.memberAchievements.findMany({
            where: (memberAchievements, { eq, and }) => and(
                eq(memberAchievements.memberId, params.mid),
                eq(memberAchievements.locationId, params.id)
            ), with: {
                achievement: true
            }
        });
        return NextResponse.json(memberAchievements, { status: 200 });
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}
