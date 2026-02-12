import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { attendances } from '@subtrees/schemas';
import { eq } from 'drizzle-orm';

export async function PATCH(req: NextRequest, props: { params: Promise<{ mid: string, id: string, rid: string, aid: string }> }) {
	const params = await props.params;
	const attendanceId = params.aid;

	if (!attendanceId) {
		return NextResponse.json({ error: "Invalid attendance id" }, { status: 400 });
	}

	try {
		const body = await req.json();
		const attendance = await db.query.attendances.findFirst({
			where: (attendances, { eq }) => eq(attendances.id, attendanceId),
		});

		if (!attendance) {
			console.error("Attendance not found for id:", params.aid);
			return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
		}

		// Continue with the rest of the logic
		const { startTime, endTime, checkInTime, checkOutTime, ipAddress, macAddress, lat, lng } = body;

		const parseDate = (dateString: string): Date | null => {
			if (!dateString) return null;
			const date = new Date(dateString);
			if (isNaN(date.getTime())) {
				console.error(`Invalid date format: ${dateString}`);
				return null;
			}
			return date;
		};

		const parsedStartTime = parseDate(startTime) || attendance.startTime;
		const parsedEndTime = parseDate(endTime) || attendance.endTime;
		const parsedCheckInTime = parseDate(checkInTime) || attendance.checkInTime;
		const parsedCheckOutTime = parseDate(checkOutTime);

		const updatedAttendance = await db.update(attendances).set({
			startTime: parsedStartTime || attendance.startTime,
			endTime: parsedEndTime || attendance.endTime,
			checkInTime: parsedCheckInTime || attendance.checkInTime,
			checkOutTime: parsedCheckOutTime,
			ipAddress: ipAddress || null,
			macAddress: macAddress || null,
			lat: lat || null,
			lng: lng || null,
		}).where(eq(attendances.id, attendanceId));


		return NextResponse.json(updatedAttendance, { status: 200 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({
			error: "Failed to update attendance",
			details: err instanceof Error ? err.message : String(err)
		}, { status: 500 });
	}
}
