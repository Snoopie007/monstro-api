
import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/db/db';

export async function GET(req: Request, props: {params: Promise<{id: string}>}) {
    const params = await props.params;
    const session = await auth();
    try {
		if (session) {
			const actions = await db.query.actions.findMany({});
			return NextResponse.json(actions, { status: 200 });
		}
	} catch (err) {
		return NextResponse.json({ error: err }, { status: 500 })
	}
}