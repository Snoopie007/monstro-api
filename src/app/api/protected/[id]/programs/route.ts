
import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/db/db';
import { eq, sql } from 'drizzle-orm';
import { classSessions, programs as program, programLevels, programs } from '@/db/schemas';
import dayjs from 'dayjs';


export async function GET(req: Request, props: { params: Promise<{ id: number }> }) {
	const params = await props.params;
	const { searchParams } = new URL(req.url);
	const pageSize = parseInt(searchParams.get('size') || "20");
	const page = parseInt(searchParams.get('page') || "1");

	// const session = await auth();

	try {
		// if (session) {
			const programs = await db.query.programs.findMany({
				limit: pageSize,
				offset: (page - 1) * pageSize,
				where: (program, { eq }) => eq(program.locationId, params.id),
				with: {
					plans: true
				},
				extras: {
					counts: db.$count(program, eq(program.locationId, params.id)).as("counts"),
					planCounts: sql<number>`(SELECT count(*) FROM member_plans WHERE member_plans.program_id = programs.id)`.as("planCounts")
				}
			})

			return NextResponse.json(programs, { status: 200 });
		// }
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}

export async function POST(req: Request, props: { params: Promise<{ id: number }> }) {
	const params = await props.params;
	const data = await req.json()
	const session = await auth();
	try {
		if (session) {
			const newProgram = db.transaction(async (trx) => {
				const [program] = await trx.insert(programs).values({
					locationId: params.id,
					name: data.program_name,
					description: data.description,
					created: new Date()
				}).returning({id: programs.id})

				for await (const session of data.sessions) {
					const [newLevel] = await trx.insert(programLevels).values({
						name: session.program_level_name,
						programId: program.id,
						capacity: session.capacity,
						minAge: session.min_age,
						maxAge: session.max_age,
						parentId: null,
						created: new Date()
					}).returning({id: programLevels.id});

					const [newSession] = await trx.insert(classSessions).values({
						monday: session.monday ? session.monday : null,
						tuesday: session.tuesday ? session.tuesday : null,
						wednesday: session.wednesday ? session.wednesday : null,
						thursday: session.thursday ? session.thursday : null,
						friday: session.friday ? session.friday : null,
						saturday: session.saturday ? session.saturday : null,
						sunday: session.sunday ? session.sunday : null,
						status: 1,  // Boolean column expects `true` or `false`
						startDate: dayjs().toDate(), // Ensure Date format
						endDate: dayjs().add(2, 'year').toDate(),
						duration_time: session.duration_time,
						programLevelId: newLevel.id,
						programId: program.id,
						created: new Date()
					}).returning({id: classSessions.id});
					

				}
			}).catch((e) => {
				console.log(e)
				return NextResponse.json({ error: e }, { status: 500 })
			});
			return NextResponse.json("Added", { status: 200 });
		}
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}