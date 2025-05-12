import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { and, eq } from 'drizzle-orm';
import { authenticateMember } from '@/libs/utils';
import { reservations } from '@/db/schemas';

export async function DELETE(req: NextRequest, props: { params: Promise<{ lid: number,rid: number }> }) {
  const params = await props.params;
  const authMember = authenticateMember(req);

  try {

      const reservation = await db.query.reservations.findFirst({
          where: (r, { eq, and }) => and(
              eq(r.id, params.rid),
              eq(r.memberId, Number(authMember.member.id)),
              eq(r.locationId, Number(params.lid))
          )
      });

      if (!reservation) {
          return NextResponse.json({ error: "Reservation not found or not authorized" }, { status: 404 });
      }
      await db.delete(reservations).where(eq(reservations.id,params.rid));

      return NextResponse.json({ 
          message: "Reservation cancelled successfully", 
      }, { status: 200 });

  } catch (err) {
      console.error(err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}