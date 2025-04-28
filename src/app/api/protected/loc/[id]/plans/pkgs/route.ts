
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { memberPlans } from '@/db/schemas';


export async function GET(req: NextRequest, props: { params: Promise<{ id: number }> }) {
    const params = await props.params;
    const { searchParams } = new URL(req.url);

    try {

        const pkgs = await db.query.memberPlans.findMany({
            where: (memberPlans, { eq, and }) => and(eq(memberPlans.locationId, params.id), eq(memberPlans.type, 'one-time')),
            with: {
                planPrograms: {
                    with: {
                        program: true
                    }
                },
            }
        })




        return NextResponse.json(pkgs, { status: 200 });
    } catch (err) {
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

export async function POST(req: Request, props: { params: Promise<{ id: number, pid: number }> }) {
    const params = await props.params;

    const { amount, ...data } = await req.json()

    const formatedAmount = amount * 100
    try {

        const [plan] = await db.insert(memberPlans).values({
            ...data,
            price: formatedAmount,
            programId: params.pid,
        }).returning({ id: memberPlans.id });

        return NextResponse.json(plan, { status: 200 });
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}