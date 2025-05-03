
import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { eq, sql } from 'drizzle-orm';
import { programSessions, programs as program, programs } from '@/db/schemas';
import { ProgramSession } from '@/types';


export async function GET(req: Request, props: { params: Promise<{ id: number }> }) {
	const params = await props.params;
	const { searchParams } = new URL(req.url);
	const pageSize = parseInt(searchParams.get('size') || "20");
	const page = parseInt(searchParams.get('page') || "1");
	const type = searchParams.get('type');

	/** Authentication will be implemented in a future update */

	try {
		const programs = await db.query.programs.findMany({
			limit: pageSize,
			offset: (page - 1) * pageSize,
			where: (program, { eq }) => eq(program.locationId, params.id),
			with: {
				planPrograms: {
					with: {
						plan: {
							columns: {
								id: true,
								name: true,
								type: true,
							}
						}
					}
				}
			},
			extras: {
				counts: db.$count(program, eq(program.locationId, params.id)).as("counts")
			}
		})

		return NextResponse.json(programs, { status: 200 });
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}


export async function POST(req: Request, props: { params: Promise<{ id: number }> }) {
	const params = await props.params;
	const { sessions, ...data } = await req.json();
	console.log(sessions, data);
	try {
		await db.transaction(async (tx) => {
			/** 
			 * Create the main program record with location ID and other data
			 * from the request body
			 */
			const [program] = await tx.insert(programs).values({
				locationId: params.id,
				...data
			}).returning({ id: programs.id });


			await tx.insert(programSessions).values(sessions.map((s: ProgramSession) => ({
				...s,
				status: 1,
				programId: program.id,
			})));
		});

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: err }, { status: 500 });
	}
}