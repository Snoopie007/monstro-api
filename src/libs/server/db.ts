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


async function hashPassword(password: string): Promise<string> {
	// Convert password to buffer
	const pwUtf8 = new TextEncoder().encode(password);

	// Generate random salt
	const salt = crypto.randomUUID();
	const saltUtf8 = new TextEncoder().encode(salt);

	// Hash the password
	const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8);

	// Create a key from the hashed password
	const key = await crypto.subtle.importKey('raw', pwHash, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

	// Sign the salt with the key
	const signature = await crypto.subtle.sign('HMAC', key, saltUtf8);

	// Convert to base64 strings
	const hashedPassword = btoa(String.fromCharCode(...new Uint8Array(signature)));

	return `${salt}:${hashedPassword}`;
}

async function compareHashedPassword(password: string, hashedPassword: string): Promise<boolean> {
	const [salt, storedHash] = hashedPassword.split(':');

	// Convert password to buffer
	const pwUtf8 = new TextEncoder().encode(password);
	const saltUtf8 = new TextEncoder().encode(salt);

	// Hash the password
	const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8);

	// Create a key from the hashed password
	const key = await crypto.subtle.importKey('raw', pwHash, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

	// Sign the salt with the key
	const signature = await crypto.subtle.sign('HMAC', key, saltUtf8);

	// Convert to base64 string
	const computedHash = btoa(String.fromCharCode(...new Uint8Array(signature)));

	return computedHash === storedHash;
}

export {
	hashPassword,
	compareHashedPassword,
	getTodaysAttendanceStatus,
	formatPhoneNumber,
	buildConflictUpdateColumns
}