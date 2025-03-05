
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { and, eq, sql } from 'drizzle-orm';
import { programSessions, programLevels } from '@/db/schemas';
import { getTodaysAttendanceStatus } from '@/libs/server/db';
import { authenticateMember } from '../../utils';


export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
	try {
		const authMember = authenticateMember(req);
		const reservationsData = await db.query.reservations.findMany({
			where: (reservations, { eq, exists, isNull }) =>
				and(
					eq(reservations.memberId, Number(authMember.member?.id || 0)), // Ensure valid number
					eq(reservations.status, 1),
					exists(
						db.select({ id: programLevels.id }) // Ensure `exists()` has a single column
							.from(programLevels)
							.innerJoin(programSessions, eq(programLevels.id, programSessions.programLevelId))
							.where(isNull(programLevels.deleted)) // Ensure `deleted_at` is null
					)
				),
			with: {
				session: {
					with: {
						level: {
							with: {
								program: {
									with: {
										location: true
									}
								},
							},
						},
					},
				},
			},
		});
		const data: any = [];
		for (const reservation of reservationsData) {
			const attendance = await getTodaysAttendanceStatus(reservation.id);

			const newReservation: any = {
				id: reservation.id,
				startDate: reservation.startDate,
				endDate: reservation.endDate,
				status: reservation.status,
				session: reservation.session,
				isMarkedAttendence: attendance,
			};

			if (reservation?.session && reservation?.session?.duration) {
				const durationDetails = getCurrentTimeDetails(reservation.session.durationTime, "UTC");
				const currentDayOfWeek = durationDetails.currentDayOfWeek;

				newReservation.session["durationTime"] = durationDetails.duration[currentDayOfWeek];
				newReservation.session["currentStatus"] = getCurrentStatus(reservation, "UTC");
			}

			data.push(newReservation);
		}
		return NextResponse.json({ reservations: data }, { status: 200 });
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}