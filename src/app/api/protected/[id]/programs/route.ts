
import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { eq, sql } from 'drizzle-orm';
import { classSessions, programs as program, programLevels, programs } from '@/db/schemas';
import { ProgranSession } from '@/types';


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
				plans: type ? {
					where: (plan, { eq }) => eq(plan.type, type as "recurring" | "one-time")
				} : true
			},
			extras: {
				counts: db.$count(program, eq(program.locationId, params.id)).as("counts"),
				planCounts: sql<number>`(SELECT count(*) FROM member_plans WHERE member_plans.program_id = programs.id)`.as("planCounts")
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
	const { levels, ...data } = await req.json();

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

			for (const level of levels) {
				/** Initialize session object with active status (1) */
				const session: ProgranSession = { status: 1 };
				const { sessions, ...rest } = level;

				/** 
				 * Process each session's schedule information:
				 * - Extract day and time
				 * - Store duration times in a structured format by day
				 */
				sessions?.forEach((s: Record<string, any>) => {
					if (!s.day || !s.time) return;
					const day = s.day.toLowerCase();
					session[day] = s.time.toString();

					if (s.durationTime) {
						session.durationTime = session.durationTime || {};
						session.durationTime[day] = s.durationTime;
					}
				});

				/** Create program level record linked to the main program */
				const [newLevel] = await tx.insert(programLevels).values({
					...rest,
					programId: program.id,
					parentId: null,
				}).returning({ id: programLevels.id });

				/** 
				 * Create class session with references to both program and level
				 * This stores the actual schedule information
				 */
				await tx.insert(classSessions).values({
					...session,
					programLevelId: newLevel.id,
					programId: program.id,
				});
			}
		});

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: err }, { status: 500 });
	}
}