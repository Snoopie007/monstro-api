
import { auth } from "@/auth";
import { db } from "@/db/db";
import { rewards } from "@/db/schemas";
import { NextResponse } from "next/server";

export async function GET(req: Request, props: { params: Promise<{ id: number }> }) {
	const params = await props.params;
	const session = await auth();
	try {
		if (session) {
			const rewards = await db.query.rewards.findMany({
				where: (rewards, { eq }) => eq(rewards.locationId, params.id),
			});
			return NextResponse.json(rewards, { status: 200 });
		}
	} catch (err) {
		return NextResponse.json({ error: err }, { status: 500 })
	}
}

export async function POST(req: Request, props: { params: Promise<{ id: number }> }) {
	const params = await props.params;
	const data = await req.json()
	try {

		const reward = await db.insert(rewards).values({
			...data,
			locationId: Number(params.id),
		}).returning({ id: rewards.id });
		return NextResponse.json(reward, { status: 200 });
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}