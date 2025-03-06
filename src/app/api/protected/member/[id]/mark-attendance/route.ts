
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { and } from 'drizzle-orm';
import { getTodaysAttendanceStatus } from '@/libs/server/db';
import dayjs from 'dayjs';
import { attendances } from '@/db/schemas';
import { authenticateMember, getCurrentTimeDetails } from '../../utils';

export async function POST(req: NextRequest, props: { params: Promise<{ id: number }> }) {
	const params = await props.params;

	try {
		const authMember = authenticateMember(req);

		const data: any = await req.json()
		const reservation = await db.query.reservations.findFirst({
			where: (reservations, { eq }) => and(
				eq(reservations.id, data.reservationId),
				eq(reservations.memberId, Number(authMember.member?.id))
			),
			with: {
				session: true
			}
		});
		// If no reservation found, return null
		if (!reservation) {
			return NextResponse.json({ error: "Reservation not found" }, { status: 400 })
		}
		let currentDayOfWeek: string = "monday";

		let startTime: dayjs.Dayjs = dayjs();
		if (reservation?.session && reservation?.session?.duration) {
			const durationDetails = getCurrentTimeDetails(reservation.session.duration, "UTC");
			currentDayOfWeek = durationDetails.currentDayOfWeek as keyof typeof reservation.session;
			startTime = dayjs(`${dayjs().format("YYYY-MM-DD")} ${reservation.session[currentDayOfWeek as keyof typeof reservation.session]}`, "YYYY-MM-DD HH:mm:ss");
		}

		const existingCheckin = await getTodaysAttendanceStatus(reservation.id);
		if (existingCheckin) {
			return NextResponse.json({ error: "Attendence for today already recorded for this program." }, { status: 500 })
		}

		await db.insert(attendances).values({
			checkInTime: new Date(),
			reservationId: reservation.id,
			timeToCheckIn: startTime.toDate()
		}).returning()
		return NextResponse.json({ success: true }, { status: 200 })
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}