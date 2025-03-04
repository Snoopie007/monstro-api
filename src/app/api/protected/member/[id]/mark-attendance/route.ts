
import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { and } from 'drizzle-orm';
import { decodeJWT, getCurrentTimeDetails } from '@/libs/utils';
import { getTodaysAttendanceStatus } from '@/libs/server/db';
import dayjs from 'dayjs';
import { attendances } from '@/db/schemas';


export async function POST(req: Request, props: { params: Promise<{ id: number }> }) {
  try {
    const params = await props.params;
    const token = req.headers.get("Authorization")?.split(" ")[1]
    const authMember = decodeJWT(token ?? "");
    const data: any = await req.json()
    if (authMember) {
      const reservation = await db.query.reservations.findFirst({
        where: (reservations, { eq }) => and(
          eq(reservations.id, data.reservationId),
          eq(reservations.memberId, Number(authMember.member?.id || 0))
        ),
        with: {
          session: true
        }
      });
      // If no reservation found, return null
      if (!reservation) return NextResponse.json({ status: 400 });
      let currentDayOfWeek: string = "monday";

      let startTime: dayjs.Dayjs = dayjs();
      if (
        reservation?.session &&
        reservation?.session?.durationTime
      ) {
        const durationDetails = getCurrentTimeDetails(reservation.session.durationTime, "UTC");
        currentDayOfWeek = durationDetails.currentDayOfWeek as keyof typeof reservation.session;
        startTime = dayjs(`${dayjs().format("YYYY-MM-DD")} ${reservation.session[currentDayOfWeek as keyof typeof reservation.session]}`, "YYYY-MM-DD HH:mm:ss");
      }

      const existingCheckin = await getTodaysAttendanceStatus(reservation.id);
      if (existingCheckin) {
        return NextResponse.json({ error: "Attendence for today already recorded for this program." }, { status: 500 })
      }
      console.log(startTime.toDate())
      console.log(startTime)
      db.transaction(async (trx) => {
        const checkin = await trx.insert(attendances).values({
          checkInTime: new Date(),
          checkOutTIme: null,
          reservationId: reservation.id,
          timeToCheckIn: startTime.toDate()
        }).returning().catch(e => {
          console.log(e)
        });
      });
      return NextResponse.json("Marked", { status: 200 })
    }
    return NextResponse.json({ status: 400 })
  } catch (err) {
    console.log(err)
    return NextResponse.json({ error: err }, { status: 500 })
  }
}