import { db } from "@/db/db";
import dayjs from "dayjs";
import { and } from "drizzle-orm";

async function getTodaysAttendanceStatus(rid: number) {
  // Check if attendance is marked today
  const todayDate = dayjs().format("YYYY-MM-DD");
  const attendance = await db.query.attendances.findFirst({
    where: (attendances, { eq, sql }: { eq: any, sql: any }) =>
      and(
        sql`DATE(check_in_time) = ${todayDate}`,
        eq(attendances.reservationId, Number(rid))
      )
  });
  return !!attendance;
}


function formatPhoneNumber(phoneNumber: string): string {
  return phoneNumber.startsWith('+')
    ? phoneNumber.replace(/[^0-9+]/g, '')
    : `+${phoneNumber.replace(/[^0-9]/g, '')}`;
}
export {
  getTodaysAttendanceStatus,
  formatPhoneNumber
}