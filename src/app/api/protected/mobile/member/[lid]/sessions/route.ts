import { db } from "@/db/db";
import { authenticateMember } from "@/libs/utils";
import { NextResponse, NextRequest } from "next/server";

export async function GET(req: NextRequest, props: { params: Promise<{ lid: number }> }) {
	const params = await props.params;
	const authMember = authenticateMember(req);

	try {
		const subscriptions = await db.query.memberSubscriptions.findMany({
			where: (memberSubscriptions, { eq, and }) => and(
				eq(memberSubscriptions.memberId, Number(authMember.member?.id)),
				eq(memberSubscriptions.locationId, params.lid)
			),
			with: {
				reservations: {
					with: {
						session: {
							with: {
								program: true
							}
						}
					}
				},
				plan: true
			}
		})

		const allSessions: any[] = [];
		const allPrograms: any[] = [];

		// First create a map to count reservations per session
		const sessionReservationCounts = new Map<number, number>();

		subscriptions.forEach(subscription => {
			// Count reservations per session
			subscription.reservations.forEach((reservation: any) => {
				const currentCount = sessionReservationCounts.get(reservation.sessionId) || 0;
				sessionReservationCounts.set(reservation.sessionId, currentCount + 1);
				allSessions.push(reservation);
			});

			// const programWithCount = {
			// 	...subscription.plan.program,
			// 	reservationCount: subscription.reservations.length,
			// 	totalSessions: subscription.plan.program.sessions.length
			// };

			// allPrograms.push(programWithCount);
		});

		allPrograms.forEach((program) => {
			program.sessions.forEach((session: any) => {
				session.isEnrolled = allSessions.some((s: any) => s.sessionId === session.id);
				session.reservationCount = sessionReservationCounts.get(session.id) || 0;
			});
		});

		return NextResponse.json(allPrograms, { status: 200 });
	}
	catch (err) {
		return NextResponse.json({ error: err }, { status: 500 });
	}
}
