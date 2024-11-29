
import { auth } from "@/auth";
import { db } from "@/db/db";
import { NextResponse } from "next/server";

export async function GET(req: Request, props: { params: Promise<{ id: number }> }) {
    const params = await props.params;
    const session = await auth();
    try {
		if (session) {
			const rewards = await db.query.rewards.findMany({
				where: (rewards, { eq }) => eq(rewards.locationId, params.id),
			});
			console.log(rewards)
			return NextResponse.json(rewards, { status: 200 });
		}
	} catch (err) {
		return NextResponse.json({ error: err }, { status: 500 })
	}
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await auth();
    const data = await req.json()
    try {

		if (session) {

			const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/rewards`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${session.user.token}`,
					"locationId": `${params.id}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(data)
			})

			if (!res.ok) {
				return NextResponse.json({ message: "An error occurred saving reward." }, { status: 400 });
			}

			return NextResponse.json({ message: "Success" }, { status: 200 });
		}
	} catch (err) {
		// console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}