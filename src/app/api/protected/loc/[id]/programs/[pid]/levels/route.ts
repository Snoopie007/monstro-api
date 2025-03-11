import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { programLevels, programSessions } from "@/db/schemas";

export async function POST(req: Request, props: { params: Promise<{ id: string, pid: string }> }) {
	const params = await props.params;

	const { sessions, ...data } = await req.json()
	try {

		const level = await db.transaction(async (tx) => {
			const [level] = await tx.insert(programLevels).values({
				...data,
				programId: params.pid,
			}).returning()

			await tx.insert(programSessions).values(sessions.map((session: any) => ({
				...session,
				programLevelId: level.id,
				status: 1
			})))

			return level
		})

		return NextResponse.json({ success: true, level }, { status: 200 });
	} catch (err) {
		console.log(err)
		return NextResponse.json({ success: false }, { status: 500 })
	}
}


