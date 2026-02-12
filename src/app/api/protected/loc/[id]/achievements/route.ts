import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { achievements } from "@subtrees/schemas";
import S3Bucket from "@/libs/server/s3";
import { hasPermission } from "@/libs/server/permissions";

export async function GET(
	req: NextRequest,
	props: { params: Promise<{ id: string }> }
) {
	const params = await props.params;

	try {
		const achievements = await db.query.achievements.findMany({
			where: (achievements, { eq }) => eq(achievements.locationId, params.id),
		});
		return NextResponse.json(achievements, { status: 200 });
	} catch (err) {
		return NextResponse.json({ error: err }, { status: 500 });
	}
}

export async function POST(
	req: NextRequest,
	props: { params: Promise<{ id: string }> }
) {
	const params = await props.params;
	const s3 = new S3Bucket();

	const formData = await req.formData();
	const file = formData.get("file") as Blob | null;
	// Extract form fields
	const data: any = {};
	for (const [key, value] of formData.entries()) {
		if (key !== "file") {
			data[key] = value;
		}
	}


	try {
		const canAddAchievement = await hasPermission("add achievement", params.id);
		if (!canAddAchievement) {
			return NextResponse.json({ error: "Access denied" }, { status: 403 });
		}


		/* Check if the achievement already exists for the plan */
		if (data.planId && data.triggerId === 3) {
			const existing = await db.query.achievements.findFirst({
				where: (a, { eq, and }) => and(
					eq(achievements.locationId, params.id),
					eq(achievements.planId, data.planId)
				)
			});
			if (existing) {
				return NextResponse.json({ error: "Achievement already exists for this plan" }, { status: 400 });
			}
		}

		let badgeUrl = data.get("badge") as string | null;

		if (file instanceof Blob && file.size > 0) {
			const fileObject = new File([file], "badge.png", { type: file.type });
			const result = await s3.uploadFile(
				fileObject,
				`badges/custom/${params.id}`
			);
			badgeUrl = result?.url || null;
		}

		const [a] = await db.insert(achievements).values({
			...data,
			badge: badgeUrl || "",
			locationId: params.id,
		}).returning();

		return NextResponse.json(a, { status: 200 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: err }, { status: 500 });
	}
}
