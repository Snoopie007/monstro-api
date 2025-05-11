import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { attendances } from '@/db/schemas';

export async function POST(req: NextRequest, props: { params: Promise<{ mid: number, id: number, rid: number }> }) {
	const params = await props.params;

	try {
		const body = await req.json();

		const { startTime, endTime, checkInTime, checkOutTime, ipAddress, macAddress, lat, lng } = body;

		if (!startTime || !endTime || !checkInTime) {
			return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
		}


		const parsedStartTime = new Date(startTime);
		const parsedEndTime = new Date(endTime);
		const parsedCheckInTime = new Date(checkInTime);
		const parsedCheckOutTime = checkOutTime ? new Date(checkOutTime) : null;


		const newAttendance = await db.insert(attendances).values({
			reservationId: params.rid,
			startTime: parsedStartTime,
			endTime: parsedEndTime,
			checkInTime: parsedCheckInTime,
			checkOutTime: parsedCheckOutTime,
			ipAddress: ipAddress || null,
			macAddress: macAddress || null,
			lat: lat || null,
			lng: lng || null,
		}).returning()


		return NextResponse.json(newAttendance, { status: 201 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: "Failed to create attendance" }, { status: 500 });
	}
}


