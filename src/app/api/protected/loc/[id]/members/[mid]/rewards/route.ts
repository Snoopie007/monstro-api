import { db } from "@/db/db";
import { NextResponse } from "next/server";

export async function GET(
	req: Request,
	props: { params: Promise<{ id: string; mid: string }> },
) {
	const params = await props.params;

	try {
		const rewards = await db.query.memberRewards.findMany({
			where: (memberRewards, { eq, and }) =>
				and(eq(memberRewards.memberId, params.mid)),
			with: {
				reward: true,
			},
		});

		return NextResponse.json(rewards, { status: 200 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: err }, { status: 500 });
	}
}
