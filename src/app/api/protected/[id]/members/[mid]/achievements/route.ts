import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/db/db';
import { and } from 'drizzle-orm';

export async function GET(req: Request, props: { params: Promise<{ mid: number, id: number }> }) {
    const params = await props.params;
    try {
        const session = await auth();
        if (session) {
            const achievements = await db.query.achievements.findMany({
                where: (achievements, { eq }) => eq(achievements.locationId, params.id)
            });
            const memberAchievements = await db.query.memberAchievements.findMany({
                where: (memberAchievements, { eq, inArray }) => and(eq(memberAchievements.memberId, params.mid), inArray(memberAchievements.achievementId, achievements.map((a) => a.id))),
                with: {
                    achievement: true
                }
            });
            return NextResponse.json(memberAchievements, { status: 200 });
        }
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}
