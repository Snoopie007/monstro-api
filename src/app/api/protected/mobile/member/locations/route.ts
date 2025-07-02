
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { authenticateMember } from '@/libs/utils';

export async function GET(req: NextRequest) {
	try {
		const authMember =  authenticateMember(req);
		const locations = await db.query.memberLocations.findMany({
			where: (location, { eq, and }) => and(
				eq(location.memberId, authMember.member?.id),
				eq(location.status, "active")
			),
			with: {
				location: true
			}
		})

		return NextResponse.json(locations, { status: 200 });
	} catch (err) {
		return NextResponse.json({ error: err }, { status: 500 })
	}
}