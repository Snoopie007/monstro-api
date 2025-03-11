import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/db/db';

export async function GET(req: Request, props: { params: Promise<{ pid: number, id: number }> }) {
	const params = await props.params;
	console.log("Get Members By ID ", params.pid)
	const session = await auth();
	try {
		if (session) {
			const items = await db.query.programMembers.findMany({
				where: (members, { eq }) => eq(members.programId, params.pid),
				with: {
					member: {
						with: {
							contracts: true
						}
					}
				}
			});

			const members = items.map(item => item.member);
			return NextResponse.json(members, { status: 200 });
		}
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}