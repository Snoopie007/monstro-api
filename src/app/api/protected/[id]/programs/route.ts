
import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/db/db';
import { eq, sql } from 'drizzle-orm';
import { programs as program } from '@/db/schemas';


export async function GET(req: Request, props: { params: Promise<{ id: number }> }) {
    const params = await props.params;
    console.log("Get Programs")
    const { searchParams } = new URL(req.url);
    const pageSize = parseInt(searchParams.get('size') || "10");
    const page = parseInt(searchParams.get('page') || "1");

    const session = await auth();

    try {
		if (session) {
			const programs = await db.query.programs.findMany({
				limit: pageSize,
				offset: (page - 1) * pageSize,
				where: (program, { eq }) => eq(program.locationId, params.id),
				with: {
					plans: true
				},
				extras: {
					counts: db.$count(program, eq(program.locationId, params.id)).as("counts"),
					planCounts: sql<number>`(SELECT count(*) FROM stripe_plans WHERE stripe_plans.program_id = programs.id)`.as("planCounts")
				}
			})


			// const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/get-programs-by-location?type=1`, {
			// 	headers: {
			// 		'Authorization': `Bearer ${session.user.token}`,
			// 		"locationId": `${params.id}`
			// 	}
			// })
			// if (!res.ok) {
			// 	return NextResponse.json({ message: "An error occurred while fetching the data." }, { status: 400 });
			// }
			// const { data } = await res.json();

			return NextResponse.json(programs, { status: 200 });
		}
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const data = await req.json()
    const session = await auth();
    try {
		if (session) {
			const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/add-program`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${session.user.token}`,
					"locationId": `${params.id}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(data)
			})
			console.log(res)
			if (!res.ok) {
				return NextResponse.json({ message: "An error occurred saving program." }, { status: 400 });
			}
			const response = await res.json();
			return NextResponse.json(response, { status: 200 });
		}
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}