import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { attendances } from '@/db/schemas';
import { evaluateTriggers } from "@/libs/achievements";
import { serviceApiClient } from "@/libs/api/server";

export async function POST(req: NextRequest, props: { params: Promise<{ mid: string, id: string, rid: string }> }) {
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
			memberId: params.mid,
			locationId: params.id,
			startTime: parsedStartTime,
			endTime: parsedEndTime,
			checkInTime: parsedCheckInTime,
			checkOutTime: parsedCheckOutTime,
			ipAddress: ipAddress || null,
			macAddress: macAddress || null,
			lat: lat || null,
			lng: lng || null,
		}).returning()

		// Evaluate attendance triggers after successful check-in
		try {
			await evaluateTriggers({
				memberId: params.mid,
				locationId: params.id,
				triggerType: 'Attendances Count',
			});
		} catch (error) {
			console.error('Error evaluating attendance triggers:', error);
			// Don't fail the request if trigger evaluation fails
		}

		// Cancel the missed class email since member checked in
		try {
			const apiClient = serviceApiClient();
			const jobId = `missed-class-${params.rid}`;

			await apiClient.delete(`/protected/locations/email/${jobId}`);
			console.log(`📧 Cancelled missed class email for reservation ${params.rid}`);
		} catch (error) {
			console.error('Error cancelling missed class email:', error);
			// Don't fail the check-in if email cancellation fails
		}

		return NextResponse.json(newAttendance, { status: 201 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: "Failed to create attendance" }, { status: 500 });
	}
}


