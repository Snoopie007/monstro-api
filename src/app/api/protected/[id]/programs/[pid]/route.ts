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

			// const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/get-programs-by-id/${params.pId}`, {
			//   headers: {
			//     'Authorization': `Bearer ${session.user.token}`,
			//     "locationId": `${params.id}`
			//   }
			// })

			// if (!res.ok) {
			//   return NextResponse.json({ message: "An error occurred while fetching the data." }, { status: 400 });
			// }
			// const { data } = await res.json();

			return NextResponse.json(program, { status: 200 });
		}
	} catch (err) {
		console.error(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}