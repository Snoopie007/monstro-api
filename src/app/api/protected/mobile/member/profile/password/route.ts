import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db/db';
import { eq } from 'drizzle-orm';
import { users } from '@/db/schemas';
import { authenticateMember } from '../../utils';
import bcrypt from 'bcryptjs';

export async function PUT(req: NextRequest, props: { params: Promise<{ id: number }> }) {

	const data = await req.json()
	if (data.currentPassword === data.newPassword) {
		return NextResponse.json({ error: "New password cannot be the same as the current password" }, { status: 400 })
	}
	try {
		const authMember = authenticateMember(req);
		let user = await db.query.users.findFirst({
			where: (users, { eq }) => eq(users.id, Number(authMember.member.id)),
			columns: {
				password: true
			}
		});

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 })
		}
		if (!user.password) {
			return NextResponse.json({ error: "No password set for this user" }, { status: 404 })
		}
		const match = await bcrypt.compare(`${data.password}`, user.password);

		if (!match) {
			return NextResponse.json({ error: "Invalid current Password" }, { status: 400 })
		}

		const hashedPassword: string = await bcrypt.hash(data.newPassword, 10)

		await db.update(users).set({
			password: hashedPassword
		}).where(eq(users.id, Number(authMember.member.id)))

		return NextResponse.json("Updated", { status: 200 })
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}