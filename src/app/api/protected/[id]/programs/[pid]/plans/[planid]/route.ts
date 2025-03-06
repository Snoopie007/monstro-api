
import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/db/db';
import { memberPlans } from '@/db/schemas';
import { eq } from 'drizzle-orm';

export async function PUT(req: Request, props: { params: Promise<{ id: string, pid: number, planid: number }> }) {
    const params = await props.params;
    const session = await auth();
    const data = await req.json()
    try {
        const res = await db.update(memberPlans).set({
            ...data
        }).where(eq(memberPlans.id, params.planid))
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}