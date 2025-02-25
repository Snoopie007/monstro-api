import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/db/db';

type TransactionProps = {
	mid: number,
	id: number
}

export async function GET(req: Request, props: { params: Promise<TransactionProps> }) {
	const params = await props.params;
	try {
		const transactions = await db.query.transactions.findMany({
			where: (transactions, { eq, and }) => and(eq(transactions.memberId, params.mid), eq(transactions.locationId, params.id)),

		})

		return NextResponse.json(transactions, { status: 200 });
	} catch (err) {
		return NextResponse.json({ error: err }, { status: 500 })
	}
}