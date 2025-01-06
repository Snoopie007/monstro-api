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
            console.log(achievements)
            const memberAchievements = await db.query.memberAchievements.findMany({
                where: (memberAchievements, { eq, inArray }) => and(eq(memberAchievements.memberId, params.mid), inArray(memberAchievements.achievementId, achievements.map((a) => a.id))),
                with: {
                    achievement: true
                }
            });
            console.log(memberAchievements)
            // const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/get-reservations-by-member/${params.mId}`, {
            //     headers: {
            //         'Authorization': `Bearer ${session.user.token}`,
            //         "locationId": `${params.id}`
            //     }
            // })
            // console.log(res)
            // if (!res.ok) {
            //     return NextResponse.json({ message: "An error occurred while fetching the data." }, { status: 400 });
            // }
            // const { data } = await res.json();
            return NextResponse.json(memberAchievements, { status: 200 });
        }
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}
