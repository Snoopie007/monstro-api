import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/db/db';
import { achievements, achievementsActions } from '@/db/schemas';
import S3Bucket from "@/libs/server/s3";

export async function GET(req: Request, props: { params: Promise<{ id: number }> }) {
	const params = await props.params;

	try {
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
	} catch (err) {
		return NextResponse.json({ error: err }, { status: 500 })
	}
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: number }> }) {
    const params = await props.params;
    const s3 = new S3Bucket();
    const data = await req.formData();
    const file = data.get('file') as Blob | null;

    try {
        let badgeUrl = data.get('badge') as string | null;
        
        
        if (file instanceof Blob && file.size > 0) {
            const fileObject = new File([file], 'badge.png', { type: file.type });
            const result = await s3.uploadFile(fileObject, `badges/custom/${params.id}`);
            badgeUrl = result?.url || null;
        }

        await db.transaction(async (trx) => {
            const [achievement] = await trx.insert(achievements).values({
                badge: badgeUrl || '',
                title: data.get('title') as string,
                description: data.get('description') as string,
                icon: data.get('icon') as string,
                points: Number(data.get('points')),
                locationId: Number(params.id),
            }).returning({ id: achievements.id });

            await trx.insert(achievementsActions).values({
                count: Number(data.get('actionCount')),
                achievementId: achievement.id,
                actionId: Number(data.get('action')),
            }).returning();
        });

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (err) {
        console.log(err);
        return NextResponse.json({ error: err }, { status: 500 });
    }
}