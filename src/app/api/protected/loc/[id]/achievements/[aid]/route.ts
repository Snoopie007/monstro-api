import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/db/db';
import { achievements } from '@/db/schemas';
import { eq } from 'drizzle-orm';

export async function GET(req: Request, props: { params: Promise<{ aid: number, id: number }> }) {
	const params = await props.params;
	const session = await auth();
	try {
		const achievement = await db.query.achievements.findFirst({
			where: (achievement, { eq }) => eq(achievement.id, params.aid),
			with: {
				actions: true
			}
		})
		return NextResponse.json(achievement, { status: 200 })
	} catch (err) {
		return NextResponse.json({ error: err }, { status: 500 })
	}
}

export async function PUT(req: Request, props: { params: Promise<{ aid: number, id: number }> }) {
	const params = await props.params;
	const session = await auth();
	const data = await req.json()
	try {
		const achievement = await db.update(achievements).set(data)
			.where(eq(achievements.id, params.aid))
			.returning({ id: achievements.id });
		return NextResponse.json(achievement, { status: 200 })

	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}

export async function DELETE(req: Request, props: { params: Promise<{ aid: number, id: number }> }) {
	const params = await props.params;
	try {
		await db.delete(achievements).where(eq(achievements.id, params.aid));

		return NextResponse.json({ success: true }, { status: 200 })
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}