import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';

import { eq, sql } from 'drizzle-orm';
import { programs } from '@/db/schemas';

type Params = {
	id: string;
	pid: string;
}

export async function GET(req: Request, props: { params: Promise<Params> }) {
	const params = await props.params;
	try {

		const program = await db.query.programs.findFirst({
			where: (programs, { eq }) => eq(programs.id, params.pid),
			with: {
					location: true,
					instructor: true,
					sessions: true,
					planPrograms: {
							with: {
									plan: true
							}
					}
			}
	});
	
		return NextResponse.json(program, { status: 200 });
	} catch (err) {
		console.error(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string, pid: string }> }) {
	const params = await props.params;
	const data = await req.json()
	try {
		await db.update(programs).set({
			...data
		}).where(eq(programs.id, params.pid))
		return NextResponse.json({ success: true }, { status: 200 })
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}