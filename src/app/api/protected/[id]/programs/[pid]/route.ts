import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/db/db';

import { sql } from 'drizzle-orm';

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
						with: {
							sessions: true,
						}
					},
					plans: {
						with: {
							pricings: true
						}
					},
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

export async function POST(req: Request, props: { params: Promise<{ id: string, pid: number }> }) {
	const params = await props.params;
	const data = await req.json()
	const session = await auth();
	try {
	if (session) {
		const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/program/${params.pid}`, {
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