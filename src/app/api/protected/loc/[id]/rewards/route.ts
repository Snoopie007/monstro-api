import { auth } from "@/libs/auth/server";
import { db } from "@/db/db";
import { rewards } from "@subtrees/schemas";
import S3Bucket from "@/libs/server/s3";
import { NextResponse, NextRequest } from "next/server";

type RewardProps = {
	params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RewardProps) {
	const locationId = await params;
	const session = await auth();

	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const rewardsList = await db.query.rewards.findMany({
			where: (rewards, { eq }) => eq(rewards.locationId, locationId.id),
		});
		return NextResponse.json(rewardsList);
	} catch (err) {
		return NextResponse.json({ error: err }, { status: 500 });
	}
}

export async function POST(req: NextRequest, props: RewardProps) {
	const params = await props.params;
	const s3 = new S3Bucket();
	const data = await req.formData();

	const files = data.getAll('files')
		.filter(file => file instanceof Blob && file.size > 0);

	try {
		const uploadedImages = await Promise.all(
			files.map(async (file) => {
				if (file instanceof Blob) {
					const result = await s3.uploadFile(file, `locs/${params.id}/rewards`);
					return result?.url;
				}
			})
		);

		const [reward] = await db.insert(rewards).values({
			name: data.get('name') as string,
			description: data.get('description') as string,
			requiredPoints: Number(data.get('requiredPoints')),
			limitPerMember: Number(data.get('limitPerMember')),
			totalLimit: data.get('totalLimit') as string,
			images: uploadedImages.filter(Boolean) as string[],
			locationId: params.id
		}).returning({ id: rewards.id });

		return NextResponse.json(reward);
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: err }, { status: 500 });
	}
}