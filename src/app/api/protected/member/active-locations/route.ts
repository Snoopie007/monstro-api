
import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { eq, sql } from 'drizzle-orm';
import { decodeJWT } from '@/libs/utils';
import { User } from '@/types';


export async function GET(req: Request) {
	try {
      const token = req.headers.get("Authorization")?.split(" ")[1]
      const authMember = decodeJWT(token ?? "");
			if(authMember){
				const locations = await db.query.memberLocations.findMany({
					where: (member, { eq }) => eq(member.memberId, Number(authMember.member?.id ? authMember.member?.id : null)),
					with: {
						location: true
					}
				})
				console.log(locations)
				return NextResponse.json(locations, { status: 200 });
			}
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}