import { NextResponse } from 'next/server';
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

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await auth();
    const formData = await req.formData();
    const s3 = new S3Bucket();
    
    try {
        // Extract all fields from formData
        const data = {
            badge: formData.get('badge') as string,
            title: formData.get('title') as string,
            description: formData.get('description') as string,
            points: Number(formData.get('points')),
            actionCount: Number(formData.get('actionCount')),
            action: Number(formData.get('action')),
            program: Number(formData.get('program')),
        };

      const icon = formData.get('badge');
      console.log(icon);
      let uploadedImageUrl: string | null = null;

      if (icon && icon instanceof Blob) {
          console.log("starting to upload");
          const file = new File([icon], `${params.id}-achievement-icon.png`, { 
              type: icon.type || "image/png", 
              lastModified: Date.now() 
          });
          console.log(file);
          const result = await s3.uploadFile(file, "achievement-icon");
          console.log(result);
          uploadedImageUrl = result?.url || null;
          console.log(uploadedImageUrl);
      } else {
          console.log("No valid file found for badge upload.");
      }

        await db.transaction(async (trx) => {
            const [achievement] = await trx.insert(achievements).values({
                badge: data.badge,
                title: data.title,
                description: data.description,
                icon: uploadedImageUrl || '',
                points: data.points,
                locationId: Number(params.id),
            }).returning({ id: achievements.id });

            await trx.insert(achievementsActions).values({
                count: data.actionCount,
                achievementId: achievement.id,
                actionId: data.action,
            }).returning();
        });
        return NextResponse.json("added", { status: 200 });

    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}