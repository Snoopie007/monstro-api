import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';

import { eq, sql } from 'drizzle-orm';
import { programs } from '@/db/schemas';
import { hasPermission } from '@/libs/server/permissions';

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
				instructor: {
					with: {
						user: true
					}
				},
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
		const canEditProgram = await hasPermission("edit program", params.id);
		if (!canEditProgram) {
			return NextResponse.json({ error: "Access denied" }, { status: 403 });
		}

		await db.update(programs).set({
			...data,
			instructorId: data.instructorId ? data.instructorId : null
		}).where(eq(programs.id, params.pid))
		return NextResponse.json({ success: true }, { status: 200 })
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string, pid: string }> }) {
	const params = await props.params;
	const body = await req.json()
	const { instructorId } = body;
	console.log(body);
	try {
		const canEditProgram = await hasPermission("edit program", params.id);
		if (!canEditProgram) {
			return NextResponse.json({ error: "Access denied" }, { status: 403 });
		}
		const [updatedProgram] = await db.update(programs).set({
			instructorId: instructorId === "null" ? undefined : instructorId
		}).where(eq(programs.id, params.pid)).returning()
		return NextResponse.json({ success: true }, { status: 200 })
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}