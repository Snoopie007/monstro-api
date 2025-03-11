
import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/db/db';

export async function GET(req: Request, props: { params: Promise<{ pid: number, id: number }> }) {
	const params = await props.params;

	try {
		const plan = await db.query.memberPlans.findFirst({
			where: (memberPlans, { eq }) => eq(memberPlans.id, params.pid),

		});

		return NextResponse.json(plan, { status: 200 });
	} catch (err) {
		return NextResponse.json({ error: err }, { status: 500 })
	}
}