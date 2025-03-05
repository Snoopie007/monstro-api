import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/db/db';

import { eq, isNull, sql } from 'drizzle-orm';
import { programs } from '@/db/schemas';

export async function GET(req: Request, props: { params: Promise<{ id: string, pid: number }> }) {
	const params = await props.params;
	console.log("Get Program by ID ", params.pid)
	try {
		const session = await auth();

		if (session) {
			const program = await db.query.programs.findFirst({
				where: (programs, { eq }) => eq(programs.id, params.pid),
				with: {
					levels: {
						where: (levels, { eq }) => eq(levels.deleted, isNull(levels.deleted)),
						with: {
							sessions: {
								with: {
									reservations: true
								}
							},
						}
					},
					plans: true,
				},
				extras: {
					memberCount: sql<number>`(SELECT count(*) FROM member_programs WHERE member_programs.program_id = programs.id)`.as("memberCount")
				}
			});
			return NextResponse.json(program, { status: 200 });
		}
	} catch (err) {
		console.error(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string, pid: number }> }) {
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