
import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { and, eq, sql } from 'drizzle-orm';
import { decodeJWT } from '@/libs/utils';
import { getTodaysAttendanceStatus } from '@/libs/server/db';


export async function GET(req: Request, props: { params: Promise<{ id: number, rid: number }> }) {
	try {
    const params = await props.params;
		const token = req.headers.get("Authorization")?.split(" ")[1]
		const authMember = decodeJWT(token ?? "");
		if (authMember) {
      const reservation = await db.query.reservations.findFirst({
        where: (reservations, {eq}) => and(
          eq(reservations.id, params.rid),
          eq(reservations.memberId, Number(authMember.member?.id || 0))
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
      // If no reservation found, return null
      if (!reservation) return null;

      const todaysAttendance = await getTodaysAttendanceStatus(reservation.id);      
      if(reservation) {
        const newreservation: any = {
          id: reservation.id,
          startDate: reservation.startDate,
          endDate: reservation.endDate,
          status: reservation.status,
          session: reservation.session,
          isMarkedAttendence: todaysAttendance
        };
        return NextResponse.json({newreservation}, { status: 200 });
      }
		}
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}