import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db/db';
import { triggeredAchievements } from '@/db/schemas';
import { and, eq } from 'drizzle-orm';


type Params = {
    aid: string;
    id: string;
}

export async function POST(req: NextRequest, props: { params: Promise<Params> }) {
    const params = await props.params;
    const data = await req.json()
    try {
        const trigger = await db.insert(triggeredAchievements).values({
            ...data,
            achievementId: params.aid,
        })
        return NextResponse.json(trigger, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest, props: { params: Promise<Params> }) {
    const params = await props.params;
    const data = await req.json()
    try {
        const trigger = await db.update(triggeredAchievements).set(data)
            .where(and(
                eq(triggeredAchievements.achievementId, params.aid),
                eq(triggeredAchievements.triggerId, data.triggerId)
            ))
            .returning();
        return NextResponse.json(trigger, { status: 200 })

    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

export async function DELETE(req: Request, props: { params: Promise<Params> }) {
    const params = await props.params;
    const { triggerId } = await req.json();
    try {
        await db.delete(triggeredAchievements).where(and(
            eq(triggeredAchievements.achievementId, params.aid),
            eq(triggeredAchievements.triggerId, triggerId)
        ));

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}