
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { and, eq } from 'drizzle-orm';
import { authenticateMember } from '@/libs/utils';


export async function GET(req: NextRequest, props: { params: Promise<{ id: number, rid: number }> }) {
	const params = await props.params;
	try {

		const authMember = authenticateMember(req);
		const reservation = await db.query.reservations.findFirst({
			where: (reservations, { eq }) => and(
				eq(reservations.memberSubscriptionId, Number(authMember.member?.id || 0))
			),
			with: {
				attendance: true
			}
		});
		return NextResponse.json(reservation?.attendance, { status: 200 });
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}