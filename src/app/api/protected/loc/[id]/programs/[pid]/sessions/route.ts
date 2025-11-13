import { db } from "@/db/db";
import { and, count, eq, inArray, isNull } from "drizzle-orm";
import { programSessions, reservations, programs, recurringReservations } from "@/db/schemas";
import { NextResponse, NextRequest } from "next/server";
import { hasPermission } from "@/libs/server/permissions";

type props = {
	params: Promise<{ pid: string }>;
};
export async function GET(req: NextRequest, props: props) {
	const { pid } = await props.params;

	try {

		const sessions = await db.query.programSessions.findMany({
			where: eq(programSessions.programId, pid),
			with: {
				staff: {
					with: {
						user: true
					}
				}
			},
			columns: {
				id: true,
				day: true,
				duration: true,
				time: true,
			}
		});

		//Session counts
		// const sessionIds = sessions.map(session => session.id);
		// const [reservationsCount, recurringReservationsCount] = await Promise.all([
		// 	db.select({ count: count(), sessionId: reservations.sessionId })
		// 		.from(reservations)
		// 		.where(inArray(reservations.sessionId, sessionIds))
		// 		.groupBy(reservations.sessionId),
		// 	db.select({ count: count(), sessionId: recurringReservations.sessionId })
		// 		.from(recurringReservations)
		// 		.where(and(inArray(recurringReservations.sessionId, sessionIds), isNull(recurringReservations.canceledOn)))
		// ]);
		// const sessionsWithCounts = sessions.map(session => {
		// 	const rc = reservationsCount.find(r => r.sessionId === session.id)?.count ?? 0;
		// 	const rrc = recurringReservationsCount.find(r => r.sessionId === session.id)?.count ?? 0;
		// 	return { ...session, reservationsCount: rc + rrc }
		// });
		return NextResponse.json(sessions, { status: 200 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: err }, { status: 500 });
	}
}

export async function POST(
	req: Request,
	props: { params: Promise<{ pid: string, id: string }> }
) {
	const params = await props.params;
	const { time, duration, day, staffId } = await req.json();

	try {
		const canAddSession = await hasPermission("edit program", params.id);
		if (!canAddSession) {
			return NextResponse.json({ error: "Access denied" }, { status: 403 });
		}

		const program = await db.query.programs.findFirst({
			where: eq(programs.id, params.pid),
			columns: {
				instructorId: true
			}
		});

		const finalStaffId = staffId ?? program?.instructorId ?? null;

		await db.transaction(async (tx) => {
			const [session] = await tx
				.insert(programSessions)
				.values({
					programId: params.pid,
					time,
					duration,
					day,
					staffId: finalStaffId
				})
				.returning({
					id: programSessions.id,
					programId: programSessions.programId,
					time: programSessions.time,
					duration: programSessions.duration,
					day: programSessions.day,
					staffId: programSessions.staffId
				});

			return session;
		});

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: err }, { status: 500 });
	}
}
