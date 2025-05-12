import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { authenticateMember } from '@/libs/utils';
import { and, eq, inArray } from 'drizzle-orm';
import { attendances, programSessions, reservations } from '@/db/schemas';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ lid: number, pid: number }> }
) {
  try {
    const params = await props.params;
    const authMember = authenticateMember(req);

    const memberId = authMember.member?.id;
    if (!memberId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all sessions for this program
    const sessions = await db.query.programSessions.findMany({
      where: (session) => eq(session.programId, params.pid),
      columns: { id: true } // Only fetch the IDs we need
    });

    if (sessions.length === 0) {
      return NextResponse.json(
        { error: 'No program sessions found' },
        { status: 404 }
      );
    }

    const sessionIds = sessions.map(s => s.id);

    // Get all reservations for these sessions
    const reservations = await db.query.reservations.findMany({
      where: (reservation) =>
        and(
          eq(reservation.memberId, Number(memberId)),
          inArray(reservation.sessionId, sessionIds)
        ),
      columns: { id: true } // Only fetch the IDs we need
    });

    if (reservations.length === 0) {
      return NextResponse.json(
        { error: 'No reservations found for this program' },
        { status: 404 }
      );
    }

    const reservationIds = reservations.map(r => r.id);

    // Get attendances for these reservations
    const attendances = await db.query.attendances.findMany({
      where: (attendance) =>
        inArray(attendance.reservationId, reservationIds),
      columns: {
        id: true,
        reservationId: true,
        startTime: true,
        endTime: true,
        checkInTime: true,
        checkOutTime: true,
        ipAddress: true,
        macAddress: true,
        lat: true,
        lng: true,
        created: true,
        updated: true
      }
    });

    return NextResponse.json(attendances, { status: 200 });

  } catch (err) {
    console.error('Error fetching attendance:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}