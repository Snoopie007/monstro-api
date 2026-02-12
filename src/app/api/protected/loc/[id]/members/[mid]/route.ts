import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { memberLocations } from '@subtrees/schemas';
import { eq } from 'drizzle-orm';
import { hasPermission } from '@/libs/server/permissions';

export async function GET(req: Request, props: { params: Promise<{ mid: string, id: string }> }) {
	const params = await props.params;
	try {
		const member = await db.query.members.findFirst({
			where: (members, { eq }) => eq(members.id, params.mid)
		});

		const family = await db.query.familyMembers.findMany({
			where: (familyMembers, { eq }) => eq(familyMembers.memberId, params.mid),
			with: {
				member: true
			}
		});

		return NextResponse.json(member, { status: 200 });
	} catch (err) {
		return NextResponse.json({ error: err }, { status: 500 })
	}
}

export async function DELETE(req: Request, props: { params: Promise<{ mid: string, id: string }> }) {
	const params = await props.params;
	try {
		const canDeleteMember = await hasPermission("delete member", params.id);
		if (!canDeleteMember) {
			return NextResponse.json({ error: "Access denied" }, { status: 403 });
		}
		
		await db.update(memberLocations).set({ status: "archived" }).where(eq(memberLocations.memberId, params.mid));
		return NextResponse.json({ message: "Member deleted from location" }, { status: 200 });
	} catch (err) {
		return NextResponse.json({ error: err }, { status: 500 })
	}
}