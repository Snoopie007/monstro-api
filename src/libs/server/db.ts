
import { SQL, sql, getTableColumns } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";


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
function generateOtp() {
	return Math.floor(100000 + Math.random() * 900000).toString();
}



export {
	formatPhoneNumber,
	buildConflictUpdateColumns,
	generateOtp
}