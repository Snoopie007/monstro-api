
import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/db/db';

export async function GET(req: Request, props: { params: Promise<{ planid: number, id: number }> }) {
    const params = await props.params;
    const session = await auth();
    try {
		if (session) {
			const plan = await db.query.memberPlans.findFirst({
				where: (memberPlans, { eq }) => eq(memberPlans.id, params.planid),

			});

			return NextResponse.json(plan, { status: 200 });
		}
	} catch (err) {
		return NextResponse.json({ error: err }, { status: 500 })
	}
}