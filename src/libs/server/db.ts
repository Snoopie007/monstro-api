import { db } from "@/db/db";
import dayjs from "dayjs";
import { and, SQL, sql, getTableColumns } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";

async function getTodaysAttendanceStatus(rid: number) {
	// Check if attendance is marked today
	const todayDate = dayjs().format("YYYY-MM-DD");
	const attendance = await db.query.attendances.findFirst({
		where: (attendances, { eq, sql }) => and(sql`DATE(check_in_time) = ${todayDate}`, eq(attendances.reservationId, Number(rid)))
	});
	return !!attendance;
}


const buildConflictUpdateColumns = <
	T extends PgTable,
	Q extends keyof T['_']['columns']
>(
	table: T,
	columns: Q[],
) => {
	const cls = getTableColumns(table);
	return columns.reduce((acc, column) => {
		const colName = cls[column].name;
		acc[column] = sql.raw(`excluded.${colName}`);
		return acc;
	}, {} as Record<Q, SQL>);
};



function formatPhoneNumber(phoneNumber: string): string {
	return phoneNumber.startsWith('+')
		? phoneNumber.replace(/[^0-9+]/g, '')
		: `+${phoneNumber.replace(/[^0-9]/g, '')}`;
}



export {
	getTodaysAttendanceStatus,
	formatPhoneNumber,
	buildConflictUpdateColumns
}