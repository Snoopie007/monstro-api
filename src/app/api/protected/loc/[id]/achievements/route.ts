import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { achievements } from "@/db/schemas";
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
      with: {
        triggedAchievement: {
          with: {
            trigger: true,
          },
        },
      },
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
  const data = await req.formData();
  const file = data.get("file") as Blob | null;

  try {
    const canAddAchievement = await hasPermission("add achievement", params.id);
    if (!canAddAchievement) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
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

    const [achievement] = await db
      .insert(achievements)
      .values({
        badge: badgeUrl || "",
        name: data.get("name") as string,
        description: data.get("description") as string,
        points: Number(data.get("points")),
        requiredActionCount: Number(data.get("requiredActionCount")),
        locationId: params.id,
      })
      .returning();

    return NextResponse.json(achievement, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
