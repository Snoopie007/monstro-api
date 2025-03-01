
import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { and, eq, sql } from 'drizzle-orm';
import { decodeJWT, getCurrentStatus, getCurrentTimeDetails } from '@/libs/utils';
import { classSessions, programLevels, reservations } from '@/db/schemas';


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
          attendances: true
        }
      });
      console.log(reservation)
			return NextResponse.json({checkIns: reservation?.attendances}, { status: 200 });
		}
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}