import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { authenticateMember } from '@/libs/utils';


export async function GET(req: NextRequest, props: { params: Promise<{ lid: number, pid: number }> }) {
  try {
    const params = await props.params;
    const authMember = authenticateMember(req);

    const memberId = authMember.member?.id;
    if (!memberId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    
    const sessions = await db.query.programSessions.findMany({
      where: (session, { eq }) => eq(session.programId, params.pid),
    });

    const sessionIds = sessions.map(s => s.id);
    if (sessionIds.length === 0) {
      return NextResponse.json({ error: 'NO Program Sessions Found' }, { status: 404 });
    }

    
    const resvs = await db.query.reservations.findMany({
      where: (reservation, { and, inArray, eq }) =>
        and(  
          eq(reservation.memberId, Number(memberId)),
          inArray(reservation.sessionId, sessionIds)
        ),
    });

    const reservationIds = resvs.map(r => r.id);
    if (reservationIds.length === 0) {
      return NextResponse.json({ error: 'NO reservations for this program Found' }, { status: 404 });
    }

    
    const allAttendances = await db.query.attendances.findMany({
      where: (attendance, { inArray }) =>
        inArray(attendance.reservationId, reservationIds),
    });

    return NextResponse.json(allAttendances, { status: 200 });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error', detail: err }, { status: 500 });
  }
}
