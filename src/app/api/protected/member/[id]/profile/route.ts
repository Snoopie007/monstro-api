import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { eq } from 'drizzle-orm';
import { members } from '@/db/schemas';
import { authenticateMember } from '../../utils';


export async function GET(req: NextRequest, props: { params: Promise<{ id: number }> }) {
	const params = await props.params;
	try {
		const authMember = authenticateMember(req);

		const member = await db.query.members.findFirst({
			where: (members, { eq }) => eq(members.id, Number(authMember.member?.id)),
			with: {
				user: {
					columns: {
						id: true, name: true, email: true
					}
				}
			}
		});
		return NextResponse.json({ member: { ...member } }, { status: 200 })

	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: number }> }) {
	const data = await req.json()
	try {
		const authMember = authenticateMember(req);

		const member = await db.query.members.findFirst({
			where: (members, { eq }) => eq(members.id, Number(authMember.member?.id)),
			columns: {
				firstName: true,
				lastName: true,
				avatar: true
			}
		});

		await db.update(members).set({
			...member,
			...data
		}).where(eq(members.id, Number(authMember.member?.id || 0))).returning()

		return NextResponse.json({ success: true }, { status: 200 })
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}