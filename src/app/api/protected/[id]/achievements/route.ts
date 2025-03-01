import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/db/db';
import { achievements, achievementsActions } from '@/db/schemas';

export async function GET(req: Request, props: { params: Promise<{ id: number }> }) {
	const params = await props.params;
	const session = await auth();
	try {
		if (session) {
			const achievements = await db.query.achievements.findMany({
				where: (achievements, { eq }) => eq(achievements.locationId, params.id),
				with: {
					members: true,
					actions: {
						with: {
							action: true
						}
					}
				}
			}).then((achievements) =>
				achievements.map((achievement) => ({
					...achievement,
					actions: achievement.actions.map(({ action, ...rest }) => ({
						...rest,
						...action, // Merge action object properties into the parent object
					})),
				}))
			)
			return NextResponse.json(achievements, { status: 200 });
		}
	} catch (err) {
		return NextResponse.json({ error: err }, { status: 500 })
	}
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
	const params = await props.params;
	const session = await auth();
	const data: any = await req.json()
	try {
		await db.transaction(async (trx) => {
			const [achievement] = await trx.insert(achievements).values({
				badge: data.badge,
				title: data.title,
				description: data.description,
				icon: data.icon,
				points: Number(data.points),
				programId: data.program ? Number(data.program) : null,
				locationId: Number(params.id),
			}).returning({ id: achievements.id });
		
			await trx.insert(achievementsActions).values({
				count: Number(data.actionCount),
				achievementId: achievement.id,
				actionId: Number(data.action),
			}).returning();
		});
		return NextResponse.json("added", { status: 200 });
		// if (session) {
		// 	const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/achievements`, {
		// 		method: 'POST',
		// 		headers: {
		// 			'Authorization': `Bearer ${session.user.token}`,
		// 			"locationId": `${params.id}`,
		// 			'Content-Type': 'application/json'
		// 		},
		// 		body: JSON.stringify(data)
		// 	})
		// 	if (!res.ok) {
		// 		return NextResponse.json({ message: "An error occurred saving achievement." }, { status: 400 });
		// 	}
		// 	return NextResponse.json({ message: "Success" }, { status: 200 });
		// }
	} catch (err) {
		// console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
} 
