import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { authenticateMember } from '@/libs/utils';
import { and, eq, inArray, or } from 'drizzle-orm';
import { reservations, attendances } from '@/db/schemas';

type SafeAttendance = {
  id: string;
  reservationId: string | null;
  startTime: Date;
  endTime: Date;
  checkInTime: Date;
  checkOutTime: Date | null;
  created: Date;
  programName: string;
};

export async function GET(req: NextRequest, props: { params: Promise<{ lid: string }> }) {
  const params = await props.params;
  
  try {
    const authMember = authenticateMember(req);
    const memberId = authMember.member?.id;
    
    // Validate member exists and get subscription/package IDs
    const member = await db.query.members.findFirst({
			where: (members, { eq }) => eq(members.id, memberId),
			with: {
				subscriptions: true,
				packages: true
			}
		});

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const subIds = member.subscriptions.map(sub => sub.id);
    const pkgIds = member.packages.map(pkg => pkg.id);
    
		  const reservations = await db.query.reservations.findMany({
      where: (reservations, { inArray, or, and, eq }) => and(
        or(
          inArray(reservations.memberSubscriptionId, subIds),
          inArray(reservations.memberPackageId, pkgIds)
        ),
        eq(reservations.locationId, params.lid)
      ),
      with: {
        session: {
          with: {
            program: true
          }
        },
        attendance: {
          // Explicitly select only the columns we need
          columns: {
            id: true,
            reservationId: true,
            startTime: true,
            endTime: true,
            checkInTime: true,
            checkOutTime: true,
            created: true
            // Exclude recurring_id by not including it here
          }
        },
      }
    });

    // Transform to SafeAttendance format
    const result: SafeAttendance[] = reservations.map(attendance => ({
      id: attendance.id,
      reservationId: attendance.attendance.reservationId,
      startTime: attendance.attendance.startTime,
      endTime: attendance.attendance.endTime,
      checkInTime: attendance.attendance.checkInTime,
      checkOutTime: attendance.attendance.checkOutTime,
      created: attendance.attendance.created,
      programName: attendance.session?.program?.name || "Unknown",
			day: attendance.session.day,
			duration: attendance.session.duration,
	    }));

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error('Error fetching attendance history:', err);
    return NextResponse.json(
      { error: "Failed to fetch attendance history" },
      { status: 500 }
    );
  }
}