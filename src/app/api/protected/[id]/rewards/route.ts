
import { auth } from "@/auth";
import { db } from "@/db/db";
import { rewards } from "@/db/schemas";
import S3Bucket from "@/libs/server/s3";
import { NextResponse, NextRequest } from "next/server";

type RewardProps = {
	params: Promise<{ id: number }>
}

export async function GET(req: NextRequest, props: RewardProps) {
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

export async function POST(req: NextRequest, props: RewardProps) {
	const params = await props.params;
	const s3 = new S3Bucket();
	const data = await req.formData();
	const files = data.getAll('files'); // Get all files from the form
	const filteredFiles = files.filter(file => file instanceof Blob && file.size > 0);
	try {

		const uploadResults = await Promise.all(filteredFiles.map(async (file) => {
			if (file instanceof Blob) {
				const result = await s3.uploadFile(file, "reward-images" as string);
				return result;
			}
		}));

		const [{ id }] = await db.insert(rewards).values({
			name: data.get('name') as string,
			description: data.get('description') as string,
			requiredPoints: Number(data.get('requiredPoints')),
			limitPerMember: Number(data.get('limitPerMember')),
			totalLimit: Number(data.get('totalLimit')),
			images: uploadResults.map((result) => result?.url || ""),
			locationId: params.id,
			created: new Date(),
		}).returning({ id: rewards.id });

		return NextResponse.json({ id }, { status: 200 });
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}