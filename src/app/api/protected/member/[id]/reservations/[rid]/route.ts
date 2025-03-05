
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { and, eq, sql } from 'drizzle-orm';
import { getTodaysAttendanceStatus } from '@/libs/server/db';
import { authenticateMember } from '../../../utils';

type MemberReservationProps = {
	params: Promise<{ id: number, rid: number }>
}

export async function GET(req: NextRequest, props: MemberReservationProps) {
	const params = await props.params;


	try {
		const authMember = authenticateMember(req);

		const reservation = await db.query.reservations.findFirst({
			where: (reservations, { eq }) => and(
				eq(reservations.memberId, Number(authMember.member.id))
			),
			with: {
				session: {
					with: {
						level: {
							with: {
								program: true
							}
						}
					}
				}
			}
		});
		if (!reservation) {
			return NextResponse.json({ error: "No reservation found" }, { status: 404 });
		};

		const todaysAttendance = await getTodaysAttendanceStatus(reservation.id);

		const newReservation: Record<string, any> = {
			...reservation,
			isMarkedAttendence: todaysAttendance
		};
		return NextResponse.json({ newReservation }, { status: 200 });
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}