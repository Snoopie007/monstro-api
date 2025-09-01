import { db } from "@/db/db";
import { NextResponse, NextRequest } from "next/server";
import { ProgramSession } from "@/types";


export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
	const { searchParams } = new URL(req.url)
	const params = await props.params
	const date = searchParams.get("date")

	try {
		const sessions: ProgramSession[] = [];
		const programs = await db.query.programs.findMany({
			where: (p, { eq, and }) => and(eq(p.locationId, params.id), eq(p.status, 'active')),
			with: {
				sessions: true
			}
		})
		programs.forEach(program => {
			program.sessions.forEach(session => {
				sessions.push({
					...session,
					program: program
				})
			})
		})

		return NextResponse.json(sessions, { status: 200 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: err }, { status: 500 });
	}
}