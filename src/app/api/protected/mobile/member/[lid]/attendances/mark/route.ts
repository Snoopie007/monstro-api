import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { attendances } from '@/db/schemas';

export async function POST(req: NextRequest, props: { params: Promise<{ mid: number, id: number, rid: number }> }) {
  const params = await props.params;

  try {
    const body = await req.json();
    const { startTime, endTime, checkInTime, checkOutTime, ipAddress, macAddress, lat, lng, rId } = body;

    if (!startTime || !endTime || !checkInTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const parsedStartTime = new Date(startTime);
    const parsedEndTime = new Date(endTime);
    const parsedCheckInTime = new Date(checkInTime);
    const parsedCheckOutTime = checkOutTime ? new Date(checkOutTime) : null;

    // Calculate allowed time windows (15 minutes before/after)
    const earlyCheckInWindow = new Date(parsedStartTime);
    earlyCheckInWindow.setMinutes(earlyCheckInWindow.getMinutes() - 15);
    
    const lateCheckOutWindow = new Date(parsedEndTime);
    lateCheckOutWindow.setMinutes(lateCheckOutWindow.getMinutes() + 15);

    // Validate check-in time
    if (parsedCheckInTime < earlyCheckInWindow || parsedCheckInTime > lateCheckOutWindow) {
      return NextResponse.json(
        { error: "Check-in time must be within 15 minutes of session start/end time" },
        { status: 400 }
      );
    }

    // Validate check-out time if provided
    if (parsedCheckOutTime) {
      if (parsedCheckOutTime < earlyCheckInWindow || parsedCheckOutTime > lateCheckOutWindow) {
        return NextResponse.json(
          { error: "Check-out time must be within 15 minutes of session start/end time" },
          { status: 400 }
        );
      }
      
      // Check that check-out is after check-in
      if (parsedCheckOutTime <= parsedCheckInTime) {
        return NextResponse.json(
          { error: "Check-out time must be after check-in time" },
          { status: 400 }
        );
      }
    }

    const newAttendance = await db.insert(attendances).values({
      reservationId: rId,
      startTime: parsedStartTime,
      endTime: parsedEndTime,
      checkInTime: parsedCheckInTime,
      checkOutTime: parsedCheckOutTime, 
      ipAddress: ipAddress || null,
      macAddress: macAddress || null,
      lat: lat || null,
      lng: lng || null,
    }).returning();

    return NextResponse.json(newAttendance, { status: 201 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: "Failed to create attendance" }, { status: 500 });
  }
}