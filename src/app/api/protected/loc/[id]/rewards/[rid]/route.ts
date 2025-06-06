import { NextResponse, NextRequest } from 'next/server';
import { db } from "@/db/db";
import { eq } from 'drizzle-orm';
import { rewards } from '@/db/schemas';
import S3Bucket from '@/libs/server/s3';


type RewardProps = {
	rid: number,
	id: number
}

const s3 = new S3Bucket();

export async function GET(request: NextRequest, props: { params: Promise<RewardProps> }) {
	const params = await props.params;

	try {
		const reward = await db.query.rewards.findFirst({
			where: (rewards, { eq }) => eq(rewards.id, params.rid)
		})
		return NextResponse.json(reward, { status: 200 })
	} catch (err) {
		return NextResponse.json({ error: err }, { status: 500 })
	}
}


export async function DELETE(req: NextRequest, props: { params: Promise<RewardProps> }) {
	const params = await props.params;

	try {

		await db.delete(rewards).where(eq(rewards.id, params.rid)).returning()

		return NextResponse.json({ success: true }, { status: 200 })
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}

export async function PUT(req: NextRequest, props: { params: Promise<RewardProps> }) {
	const params = await props.params;
	const data = await req.formData()
	const files = data.getAll('files') as File[];
	const images = data.getAll('images') as string[];
	const removedImages = data.getAll('removedImages') as string[];

	const filteredFiles = files.filter(file => file instanceof Blob && file.size > 0);
	try {
		let newImages = images;

		if (removedImages.length > 0) {
			await Promise.all(removedImages.map(async (image) => {
				const name = image.split('/').pop() || '';
				console.log(name)
				await s3.removeFile("reward-images", name);
			}))
			newImages = newImages.filter(image => !removedImages.includes(image));
		}

		if (filteredFiles.length > 0) {
			const results = await Promise.all(filteredFiles.map(async (file) => {
				if (file instanceof Blob) {
					const result = await s3.uploadFile(file, "reward-images" as string);
					return result;
				}
			}))
			const newUrls = results.map((result) => result?.url || "");
			newImages = newImages.concat(newUrls);
		}

		await db.update(rewards).set({
			name: data.get('name') as string,
			description: data.get('description') as string,
			requiredPoints: Number(data.get('requiredPoints')),
			limitPerMember: Number(data.get('limitPerMember')),
			totalLimit: data.get('totalLimit') as string,
			images: newImages,
			updated: new Date()
		}).where(eq(rewards.id, params.rid))

		return NextResponse.json({ success: true }, { status: 200 })
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}